using System.Text.Json;
using Aletheia.Sdk.AI.Scenarios;
using Aletheia.Sdk.Program.Aspects;

namespace Aletheia.Sdk.Program.AI;

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

    /// <summary>Model role: a vision-capable model that describes photos.</summary>
    public const string VisionRole = "vision";

    /// <summary>Model role: the form-filling model that emits property JSON.</summary>
    public const string FillRole = "form-fill";

    /// <summary>Registers every Homestia scenario into the shared registry.</summary>
    public static void Register(ScenarioRegistry registry)
    {
        ArgumentNullException.ThrowIfNull(registry);

        registry
            .Register(CreateScenario(CreateText, withPhotos: false))
            .Register(CreateScenario(CreatePhotos, withPhotos: true))
            .Register(EditScenario(EditText, withPhotos: false))
            .Register(EditScenario(EditPhotos, withPhotos: true));
    }

    private static ScenarioDefinition CreateScenario(string key, bool withPhotos) =>
        BuildScenario(key, "Create a property from the user's description and photos.", withPhotos, edit: false);

    private static ScenarioDefinition EditScenario(string key, bool withPhotos) =>
        BuildScenario(key, "Edit a property from the user's requested changes and photos.", withPhotos, edit: true);

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

        Follow the View Contract exactly. For every field the contract marks as an IRI reference,
        call the matching list/read tool to discover valid IRIs — never invent IRIs. Do not call
        any create, update, or delete tools; you only return JSON.
        """;

    private static JsonElement EmptySchema() =>
        JsonSerializer.SerializeToElement(new { type = "object" });


}
