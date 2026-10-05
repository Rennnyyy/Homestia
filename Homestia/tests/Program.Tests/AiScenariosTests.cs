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

        var expected = new List<string>
        {
            AiScenarios.CreateText,
            AiScenarios.EditText,
            AiScenarios.CompleteText,
            AiScenarios.IntentText,
        };
        expected.AddRange(ViewAspects.RentalStages.Select(AiScenarios.RentalStageText));

        registry.Scenarios.Keys.ShouldBe(expected, ignoreOrder: true);
    }

    [Fact]
    public void The_contract_stage_has_a_scenario_whose_view_declares_no_fields()
    {
        var registry = RegisterAll();

        // The assistant is offered on EVERY stage (it is also a place to ask), so the key must exist.
        // Its AI view declares no fields, though: the stage's only field is an uploaded document, and
        // a model cannot supply a blob — a field it could see would be an invitation to invent an IRI.
        var scenario = registry.Scenarios[AiScenarios.RentalStageText("contract")];
        scenario.Steps.ShouldHaveSingleItem();
        scenario.Steps[0].ViewIri.ShouldBe(
            ViewAspects.AiShapeIriFor(ViewAspects.RentalContractShapeIri));
    }

    [Fact]
    public void Each_rental_stage_scenario_is_judged_by_that_stages_ai_view()
    {
        var registry = RegisterAll();

        foreach (var stage in ViewAspects.RentalStages)
        {
            var scenario = registry.Scenarios[AiScenarios.RentalStageText(stage)];
            scenario.Steps.ShouldHaveSingleItem();
            scenario.Steps[0].ViewIri.ShouldBe(
                ViewAspects.AiShapeIriFor(ViewAspects.RentalStageShapeIri(stage)));
        }
    }

    [Fact]
    public void Complete_scenarios_apply_a_follow_up_to_the_draft()
    {
        var registry = RegisterAll();

        var complete = registry.Scenarios[AiScenarios.CompleteText];
        complete.Steps.ShouldHaveSingleItem();
        complete.Steps[0].Name.ShouldBe("complete_form");
        // The form's own view: a partial result is judged by the rules the user's
        // save is judged by.
        complete.Steps[0].ViewIri.ShouldBe(ViewAspects.PropertyShapeIri);
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
    public void Edit_scenarios_validate_against_the_property_view()
    {
        var registry = RegisterAll();

        var edit = registry.Scenarios[AiScenarios.EditText];
        edit.Steps.ShouldHaveSingleItem();
        edit.Steps[0].Name.ShouldBe("fill_form");
        edit.Steps[0].ViewIri.ShouldBe(ViewAspects.PropertyShapeIri);
    }

    [Fact]
    public void Create_scenarios_build_from_the_users_request()
    {
        var registry = RegisterAll();

        var create = registry.Scenarios[AiScenarios.CreateText];
        create.Steps.ShouldHaveSingleItem();
        create.Steps[0].Name.ShouldBe("fill_form");
        create.Steps[0].ViewIri.ShouldBe(ViewAspects.PropertyShapeIri);
    }
}
