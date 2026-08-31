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
    /// <summary>Scenario key: create a property from free text.</summary>
    public const string CreateText = "property.create.text";

    /// <summary>Scenario key: create a property from photos (and optional text).</summary>
    public const string CreatePhotos = "property.create.photos";

    /// <summary>Scenario key: edit a property from free text.</summary>
    public const string EditText = "property.edit.text";

    /// <summary>Scenario key: edit a property from photos (and optional text).</summary>
    public const string EditPhotos = "property.edit.photos";

    /// <summary>Scenario key: decide whether the user wants to create or edit (text).</summary>
    public const string IntentText = "property.intent.text";

    /// <summary>Scenario key: decide whether the user wants to create or edit (photos).</summary>
    public const string IntentPhotos = "property.intent.photos";

    /// <summary>Scenario key: continue/correct an in-progress draft from free text.</summary>
    public const string CompleteText = "property.complete.text";

    /// <summary>Scenario key: continue/correct an in-progress draft with photos.</summary>
    public const string CompletePhotos = "property.complete.photos";

    /// <summary>Model role: a vision-capable model that describes photos.</summary>
    public const string VisionRole = "vision";

    /// <summary>Model role: the form-filling model that emits property JSON.</summary>
    public const string FillRole = "formfill";

    /// <summary>Registers every Homestia scenario into the shared registry.</summary>
    public static void Register(ScenarioRegistry registry)
    {
        ArgumentNullException.ThrowIfNull(registry);

        registry
            .Register(CreateScenario(CreateText, withPhotos: false))
            .Register(CreateScenario(CreatePhotos, withPhotos: true))
            .Register(EditScenario(EditText, withPhotos: false))
            .Register(EditScenario(EditPhotos, withPhotos: true))
            .Register(CompleteScenario(CompleteText, withPhotos: false))
            .Register(CompleteScenario(CompletePhotos, withPhotos: true))
            .Register(IntentScenario(IntentText, withPhotos: false))
            .Register(IntentScenario(IntentPhotos, withPhotos: true));
    }

    private static ScenarioDefinition CreateScenario(string key, bool withPhotos) =>
        BuildScenario(key, "Create a property from the user's description and photos.", withPhotos, edit: false);

    private static ScenarioDefinition EditScenario(string key, bool withPhotos) =>
        BuildScenario(key, "Edit a property from the user's requested changes and photos.", withPhotos, edit: true);

    /// <summary>
    /// Continues/corrects an in-progress draft: the user's follow-up request is
    /// applied on top of the existing draft ("add address …"). Everything the
    /// draft already contains is kept; the lenient AI shape keeps a still-partial
    /// result acceptable.
    /// </summary>
    private static ScenarioDefinition CompleteScenario(string key, bool withPhotos)
    {
        var steps = new List<ScenarioStep>();

        if (withPhotos)
        {
            steps.Add(new ScenarioStep(
                Name: "describe_images",
                ModelRole: VisionRole,
                Instruction: VisionInstruction,
                OutputSchema: EmptySchema(),
                MaxRetries: 0,
                ViewIri: null,
                TextOutput: true));
        }

        steps.Add(new ScenarioStep(
            Name: "complete_form",
            ModelRole: FillRole,
            Instruction: CompleteInstruction,
            OutputSchema: EmptySchema(),
            MaxRetries: 3,
            ViewIri: ViewAspects.AiPropertyShapeIri,
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
    private static ScenarioDefinition IntentScenario(string key, bool withPhotos)
    {
        var steps = new List<ScenarioStep>();

        if (withPhotos)
        {
            steps.Add(new ScenarioStep(
                Name: "describe_images",
                ModelRole: VisionRole,
                Instruction: VisionInstruction,
                OutputSchema: EmptySchema(),
                MaxRetries: 0,
                ViewIri: null,
                TextOutput: true));
        }

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

    private static ScenarioDefinition BuildScenario(string key, string description, bool withPhotos, bool edit)
    {
        var steps = new List<ScenarioStep>();

        if (withPhotos)
        {
            steps.Add(new ScenarioStep(
                Name: "describe_images",
                ModelRole: VisionRole,
                Instruction: VisionInstruction,
                OutputSchema: EmptySchema(),
                MaxRetries: 0,
                ViewIri: null,
                TextOutput: true));
        }

        // The lenient AI shape (not the strict form shape) so a partial fill
        // still succeeds; missing fields surface as warnings for the user.
        steps.Add(new ScenarioStep(
            Name: "fill_form",
            ModelRole: FillRole,
            Instruction: FillInstruction(edit),
            OutputSchema: EmptySchema(),
            MaxRetries: 3,
            ViewIri: ViewAspects.AiPropertyShapeIri,
            TextOutput: false));

        return new ScenarioDefinition(key, description, steps);
    }

    private const string VisionInstruction = """
        You describe real-estate photos so another model can fill a property form.

        The user message is a JSON payload that may contain a "userPrompt" field.
        If "userPrompt" is present and not empty, output it verbatim first, prefixed with "User request: ".

        Then describe the property shown in the attached photos in detail: the building type,
        the address if legible, the exterior and interior condition, every room and its
        approximate size in square metres, the furnishing, and anything else relevant to
        filling a property rental form. Plain prose is fine.
        """;

    private static string FillInstruction(bool edit) => $"""
        You fill the Homestia property form from the information in the user message.

        The user message is either a JSON object with "userPrompt" (the free-text request)
        and "current" (the existing property — empty for create), or a text description of
        property photos with an optional "User request:" prefix.

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

        The user message is either a JSON object with "userPrompt" (the user's request, possibly
        transcribed from voice) and "properties" (existing properties, each with "iri", "name", and
        "address"), or a text description of property photos with an optional "User request:" prefix.

        Decide:
        - CREATE: the user is describing a NEW property to add.
        - EDIT: the user wants to CHANGE an existing property. Find the matching property in the
          "properties" list by the name or address they mention. If nothing matches, return an
          empty "propertyIri" — the app will let the user pick.

        Respond with a single JSON object:
        {"intent": "create" | "edit", "propertyIri": "<matching iri or empty string>"}
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
