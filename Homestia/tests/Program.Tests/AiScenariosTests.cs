using Aletheia.Sdk.AI.Scenarios;
using Homestia.AI;
using Homestia.Aspects;
using Shouldly;

namespace Homestia.Tests;

/// <summary>
/// Unit tests for <see cref="AiScenarios"/> — the AI scenario flows for
/// create, edit, and create-vs-edit intent detection.
/// </summary>
public sealed class AiScenariosTests
{
    private static ScenarioRegistry RegisterAll()
    {
        var registry = new ScenarioRegistry();
        AiScenarios.Register(registry);
        return registry;
    }

    [Fact]
    public void Register_registers_all_scenario_families()
    {
        var registry = RegisterAll();

        registry.Scenarios.Keys.ShouldBe(
            [
                AiScenarios.CreateText,
                AiScenarios.EditText,
                AiScenarios.CompleteText,
                AiScenarios.IntentText,
            ],
            ignoreOrder: true);
    }

    [Fact]
    public void Complete_scenarios_apply_a_follow_up_to_the_draft()
    {
        var registry = RegisterAll();

        var complete = registry.Scenarios[AiScenarios.CompleteText];
        complete.Steps.ShouldHaveSingleItem();
        complete.Steps[0].Name.ShouldBe("complete_form");
        // The lenient AI shape — a still-partial draft stays acceptable.
        complete.Steps[0].ViewIri.ShouldBe(ViewAspects.AiPropertyShapeIri);
    }

    [Fact]
    public void Intent_scenarios_end_with_a_detect_intent_step()
    {
        var registry = RegisterAll();

        var text = registry.Scenarios[AiScenarios.IntentText];
        text.Steps.ShouldHaveSingleItem();
        text.Steps[0].Name.ShouldBe("detect_intent");
        text.Steps[0].ViewIri.ShouldBeNull();
    }

    [Fact]
    public void Edit_scenarios_validate_against_the_lenient_ai_property_shape()
    {
        var registry = RegisterAll();

        var edit = registry.Scenarios[AiScenarios.EditText];
        edit.Steps.ShouldHaveSingleItem();
        edit.Steps[0].Name.ShouldBe("fill_form");
        edit.Steps[0].ViewIri.ShouldBe(ViewAspects.AiPropertyShapeIri);
    }

    [Fact]
    public void Create_scenarios_build_from_the_users_request()
    {
        var registry = RegisterAll();

        var create = registry.Scenarios[AiScenarios.CreateText];
        create.Steps.ShouldHaveSingleItem();
        create.Steps[0].Name.ShouldBe("fill_form");
        create.Steps[0].ViewIri.ShouldBe(ViewAspects.AiPropertyShapeIri);
    }
}
