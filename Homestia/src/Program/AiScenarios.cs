using System.Text.Json;
using Aletheia.Sdk.AI.Scenarios;
using Homestia.Aspects;

namespace Homestia.AI;

/// <summary>
/// Code-defined AI scenario flows for Homestia.
/// <br/><br/>
/// A scenario is an ordered pipeline of steps, each bound to a model role that
/// is resolved from configuration (<c>AI:ModelRoles</c>). The final step's
/// validated output is the form proposal the frontend renders in the review
/// step. Instructions live here, beside the flows, because flows are code.
/// </summary>
public static class AiScenarios
{
    /// <summary>Scenario key: create a property from free text or voice.</summary>
    public const string CreateText = "property.create.text";

    /// <summary>Scenario key: edit a property from free text or voice.</summary>
    public const string EditText = "property.edit.text";

    /// <summary>Scenario key: decide whether the user wants to create or edit.</summary>
    public const string IntentText = "property.intent.text";

    /// <summary>Scenario key: continue/correct an in-progress draft from text or voice.</summary>
    public const string CompleteText = "property.complete.text";

    /// <summary>Scenario key: start a rental application from free text or voice.</summary>
    public const string RentalCreateText = "rental.create.text";

    /// <summary>Scenario key: change an existing rental application from free text or voice.</summary>
    public const string RentalEditText = "rental.edit.text";

    /// <summary>Scenario key: continue/correct an in-progress rental draft from text or voice.</summary>
    /// <summary>
    /// Scenario key that fills ONE rental stage from free text or voice:
    /// <c>rental.stage.{stage}.text</c>, e.g. <c>rental.stage.deposit.text</c>.
    /// <br/><br/>
    /// The assistant is launched from inside the stepper, so it already knows WHICH stage the reader
    /// stands on — there is no create-vs-edit question to ask and no draft to detect, which is why the
    /// rentals carry one scenario per stage and none of the property family's intent/complete keys.
    /// </summary>
    public static string RentalStageText(string stage) => $"rental.stage.{stage}.text";

    /// <summary>Model role: the form-filling model that emits property JSON.</summary>
    public const string FillRole = "formfill";

    /// <summary>Registers every Homestia scenario into the shared registry.</summary>
    public static void Register(ScenarioRegistry registry)
    {
        ArgumentNullException.ThrowIfNull(registry);

        registry
            .Register(CreateScenario(CreateText))
            .Register(EditScenario(EditText))
            .Register(CompleteScenario(CompleteText))
            .Register(IntentScenario(IntentText));

        // One scenario per rental stage, keyed by the stage the stepper shows. The stage's own AI view
        // gives the step its field contract, so the model is asked for the right fields by
        // construction rather than by a sentence in the instruction — and the Contract stage's view
        // declares no fields at all, so there is nothing there for the model to invent.
        foreach (var stage in ViewAspects.RentalStages)
        {
            registry.Register(RentalStageScenario(stage));
        }
    }

    private static ScenarioDefinition CreateScenario(string key) =>
        BuildScenario(key, "Create a property from the user's description.", edit: false);

    private static ScenarioDefinition EditScenario(string key) =>
        BuildScenario(key, "Edit a property from the user's requested changes.", edit: true);

    /// <summary>
    /// Continues/corrects an in-progress draft: the user's follow-up request is
    /// applied on top of the existing draft ("add address …"). Everything the
    /// draft already contains is kept, and the result is judged by the SAME view
    /// the form renders under — a field still missing is reported against it, not
    /// waved through by a milder rule.
    /// </summary>
    private static ScenarioDefinition CompleteScenario(string key)
    {
        var steps = new List<ScenarioStep>();

        steps.Add(new ScenarioStep(
            Name: "complete_form",
            ModelRole: FillRole,
            Instruction: CompleteInstruction,
            OutputSchema: EmptySchema(),
            MaxRetries: 3,
            ViewIri: ViewAspects.PropertyShapeIri,
            TextOutput: false));

        return new ScenarioDefinition(
            key,
            "Complete a partially filled property from the user's follow-up request.",
            steps);
    }

    /// <summary>
    /// Routes the user's request (free text or transcribed voice) to CREATE or
    /// EDIT before any form filling happens. Returns a small JSON classification:
    /// <c>{ "intent": "create" | "edit", "propertyIri": string }</c> — an empty
    /// <c>propertyIri</c> means "edit intended but no property matched".
    /// </summary>
    private static ScenarioDefinition IntentScenario(string key)
    {
        var steps = new List<ScenarioStep>();

        steps.Add(new ScenarioStep(
            Name: "detect_intent",
            ModelRole: FillRole,
            Instruction: IntentInstruction,
            OutputSchema: IntentSchema(),
            MaxRetries: 1,
            ViewIri: null,
            TextOutput: false));

        return new ScenarioDefinition(
            key,
            "Decide whether the user wants to create or edit a property.",
            steps);
    }

    /// <summary>
    /// Fills ONE rental stage — the stage the stepper is showing. The step is judged by the stage's
    /// AI view: the same fields as the form, with the presence rules lifted, so a sentence that
    /// carries only part of the stage still returns a usable draft instead of exhausting its retries.
    /// </summary>
    private static ScenarioDefinition RentalStageScenario(string stage)
    {
        var steps = new List<ScenarioStep>();

        steps.Add(new ScenarioStep(
            Name: "fill_stage",
            ModelRole: FillRole,
            Instruction: RentalStageInstruction,
            OutputSchema: EmptySchema(),
            MaxRetries: 3,
            ViewIri: ViewAspects.AiShapeIriFor(ViewAspects.RentalStageShapeIri(stage)),
            TextOutput: false));

        return new ScenarioDefinition(
            RentalStageText(stage),
            $"Fill the '{stage}' stage of a rental agreement from the user's description.",
            steps);
    }

    private static ScenarioDefinition BuildScenario(string key, string description, bool edit)
    {
        var steps = new List<ScenarioStep>();

        // The SAME view the form renders under — the AI's output is judged by the
        // rules the user's own save is judged by, so a field the AI omits is a
        // violation the user sees, not a warning that quietly differs from what
        // the form would demand.
        steps.Add(new ScenarioStep(
            Name: "fill_form",
            ModelRole: FillRole,
            Instruction: FillInstruction(edit),
            OutputSchema: EmptySchema(),
            MaxRetries: 3,
            ViewIri: ViewAspects.PropertyShapeIri,
            TextOutput: false));

        return new ScenarioDefinition(key, description, steps);
    }

    private static string FillInstruction(bool edit) => $"""
        You fill the Homestia property form from the information in the user message.

        The user message is a JSON object with "userPrompt" (the free-text request, possibly
        transcribed from voice) and "current" (the existing property — empty for create).

        {(edit
            ? "This is an EDIT: keep the values in \"current\" unless the user explicitly asks to change them."
            : "This is a CREATE: build the property from the user's request.")}

        Always respond with a single JSON object and nothing else — never prose, never an explanation,
        never a refusal. If the request is missing details, fill in what you can and leave the rest
        empty or omitted rather than inventing values; a partial form is acceptable and completed later.

        Fill in every field you can determine from the request. Never invent IRIs.

        Follow the View Contract exactly. For every field the contract marks as an IRI reference,
        call the matching list/read tool to discover valid IRIs. Do not call any create, update,
        or delete tools; you only return JSON.
        """;

    private const string CompleteInstruction = """
        You complete a partially filled Homestia property form from the user's additional request.

        The user message is a JSON object with:
        - "userPrompt": the user's new request (possibly transcribed from voice), e.g. "add address Hauptstrasse 12", and
        - "current": the draft — the fields already filled.

        Keep every value already present in "current"; only add or change what the user now asks for.
        Never remove or reset existing values. If the request lacks detail, leave fields empty or omitted
        rather than guessing.

        Always respond with a single JSON object — never prose, never an explanation, never a refusal.
        Fill in what you can and leave the rest empty or omitted.

        For every field the contract marks as an IRI reference, call the matching list/read tool to
        discover valid IRIs — never invent IRIs. Do not call any create, update, or delete tools;
        you only return JSON.
        """;

    private const string IntentInstruction = """
        You decide whether the user wants to CREATE a new property or EDIT an existing one.

        The user message is a JSON object with "userPrompt" (the user's request, possibly
        transcribed from voice) and "properties" (existing properties, each with "iri", "name", and
        "address").

        Decide:
        - CREATE: the user is describing a NEW property to add.
        - EDIT: the user wants to CHANGE an existing property. Find the matching property in the
          "properties" list by the name or address they mention. If nothing matches, return an
          empty "propertyIri" — the app will let the user pick.

        Respond with a single JSON object:
        {"intent": "create" | "edit", "propertyIri": "<matching iri or empty string>"}
        """;

    private const string RentalStageInstruction = """
        You fill ONE stage of a Homestia rental agreement from the information in the user message.

        The user message is a JSON object with:
        - "userPrompt": the reader's request (possibly transcribed from voice), e.g. "she paid 1200 on the 3rd", and
        - "current": the rental so far — the fields already filled, from earlier stages as well as this one.

        Fill the fields the View Contract below defines for THIS stage. Keep every value already present
        in "current": the earlier stages are not yours to change, and a field the reader did not mention
        must be left as it is rather than cleared.

        Fill only what the request actually supports. A stage may be saved partially and completed later,
        so a field nobody mentioned is left OUT — never invented, never guessed from a plausible-looking
        default. Never invent IRIs.

        Always respond with a single JSON object and nothing else — never prose, never an explanation,
        never a refusal.

        Follow the View Contract exactly. For every field the contract marks as an IRI reference, call
        the matching list/read tool to discover valid IRIs — look up the existing tenants, properties
        and rooms before choosing. Do not call any create, update, or delete tools; you only return JSON.
        """;

    /// <summary>
    /// Output contract for the intent step: a create/edit classification plus an
    /// optional matched property IRI (empty string when nothing matched).
    /// </summary>
    private static JsonElement IntentSchema() => JsonSerializer.SerializeToElement(new
    {
        type = "object",
        properties = new
        {
            intent = new { type = "string", @enum = new[] { "create", "edit" } },
            propertyIri = new { type = "string" },
        },
        required = new[] { "intent" },
        additionalProperties = false,
    });
    private static JsonElement EmptySchema() =>
        JsonSerializer.SerializeToElement(new { type = "object" });


}
