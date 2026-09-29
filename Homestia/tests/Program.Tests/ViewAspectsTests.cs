using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Homestia.Aspects;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using System.Text.RegularExpressions;

namespace Homestia.Tests;

/// <summary>
/// Unit tests for <see cref="ViewAspects"/> — the frontend-purpose view
/// registration served through the SDK's view family.
/// </summary>
public sealed class ViewAspectsTests
{
    private static IAspectStore CreateStore()
    {
        var services = new ServiceCollection();
        services.AddAspects();
        return services.BuildServiceProvider().GetRequiredService<IAspectStore>();
    }

    [Fact]
    public void RegisterViews_registers_the_full_view_family()
    {
        var store = CreateStore();

        Should.NotThrow(() => ViewAspects.RegisterViews(store));

        store.ViewIris.ShouldBe(
            [
                ViewAspects.PropertyShapeIri,
                ViewAspects.RoomShapeIri,
                ViewAspects.TenantShapeIri,
                ViewAspects.RentalApplicationShapeIri,
                ViewAspects.RentalContractShapeIri,
                ViewAspects.RentalDepositShapeIri,
                ViewAspects.RentalHandoverShapeIri,
                ViewAspects.RentalTenancyShapeIri,
                ViewAspects.RentalNoticedShapeIri,
                ViewAspects.RentalHandbackShapeIri,
                ViewAspects.RentalTerminatedShapeIri,
            ],
            ignoreOrder: true);
    }

    [Fact]
    public void Rental_stage_shapes_target_distinct_classes()
    {
        // The view engine types the value with the shape's first target class and
        // validates against ALL shapes for that class. Each rental stage must
        // therefore target a distinct class so completing one stage never pulls
        // the required fields of the others into the validation.
        ViewAspects.RentalApplicationTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:application>");
        ViewAspects.RentalContractTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:contract>");
        ViewAspects.RentalDepositTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:deposit>");
        ViewAspects.RentalHandoverTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:handover>");
        ViewAspects.RentalTenancyTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:tenancy>");
        ViewAspects.RentalNoticedTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:noticed>");
        ViewAspects.RentalHandbackTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:handback>");
        ViewAspects.RentalTerminatedTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Rental:terminated>");
    }



    [Fact]
    public void Registered_views_carry_the_full_ttl()
    {
        var store = CreateStore();
        ViewAspects.RegisterViews(store);

        var property = store.ResolveView(ViewAspects.PropertyShapeIri);
        property.ViewTtl.ShouldBe(ViewAspects.PropertyTtl);

        var room = store.ResolveView(ViewAspects.RoomShapeIri);
        room.ViewTtl.ShouldBe(ViewAspects.RoomTtl);
    }

    [Fact]
    public void Views_are_not_enforcement_aspects()
    {
        var store = CreateStore();
        ViewAspects.RegisterViews(store);

        // The view family is non-enforcing: nothing lands in the operation
        // family, so writes are never guarded by frontend views.
        store.OperationIris.ShouldBeEmpty();
    }

    [Fact]
    public void Property_view_declares_rooms_as_nested_node_shape()
    {
        ViewAspects.PropertyTtl.ShouldContain("sh:node <urn:aletheia:homestia:shapes:room>");
        ViewAspects.PropertyTtl.ShouldContain("sh:targetClass <urn:aletheia:homestia:Property>");
    }

    [Fact]
    public void View_messages_are_i18n_keys()
    {
        ViewAspects.PropertyTtl.ShouldContain("sh:message \"shape.property.name\"");
        ViewAspects.RoomTtl.ShouldContain("sh:message \"shape.room.roomSize\"");
    }

    /// <summary>
    /// Every shape Homestia serves — the 13 views plus the query result shape —
    /// as input for the bilingual-name guard below.
    /// </summary>
    public static TheoryData<string, string> ServedShapes() => new()
    {
        { nameof(ViewAspects.PropertyTtl), ViewAspects.PropertyTtl },
        { nameof(ViewAspects.RoomTtl), ViewAspects.RoomTtl },
        { nameof(ViewAspects.TenantTtl), ViewAspects.TenantTtl },
        { nameof(ViewAspects.RentalApplicationTtl), ViewAspects.RentalApplicationTtl },
        { nameof(ViewAspects.RentalContractTtl), ViewAspects.RentalContractTtl },
        { nameof(ViewAspects.RentalDepositTtl), ViewAspects.RentalDepositTtl },
        { nameof(ViewAspects.RentalHandoverTtl), ViewAspects.RentalHandoverTtl },
        { nameof(ViewAspects.RentalTenancyTtl), ViewAspects.RentalTenancyTtl },
        { nameof(ViewAspects.RentalNoticedTtl), ViewAspects.RentalNoticedTtl },
        { nameof(ViewAspects.RentalHandbackTtl), ViewAspects.RentalHandbackTtl },
        { nameof(ViewAspects.RentalTerminatedTtl), ViewAspects.RentalTerminatedTtl },
        { nameof(QueryAspects.RentalStateResultShapeTtl), QueryAspects.RentalStateResultShapeTtl },
    };

    /// <summary>
    /// Every property shape must name its field in BOTH languages. The SDK's
    /// naming gate only demands English; the German name is what the platform
    /// localization layer (AddPlatformLocalization + MapLocalization) turns into
    /// the labels a German-speaking user sees in the tables and forms. Without
    /// it the UI can never switch language.
    /// </summary>
    [Theory]
    [MemberData(nameof(ServedShapes))]
    public void Every_property_shape_names_its_field_in_both_languages(string shape, string ttl)
    {
        var names = Regex.Matches(ttl, @"sh:name\s+""(?<label>[^""]+)""@en(?<tail>[^;]*)");
        // A result shape is a projection as well as a binding: the store clears
        // every predicate the shape does not mention. RentalStateResultShapeTtl
        // therefore names NO properties on purpose — it has no field to label.
        // The guard covers the shapes that declare fields: the sh:property ones.
        if (!ttl.Contains("sh:property"))
            return;
        names.Count.ShouldBeGreaterThan(0, $"{shape} declares no English sh:name at all.");

        foreach (Match match in names)
        {
            var label = match.Groups["label"].Value;
            match.Groups["tail"].Value.ShouldContain(
                "@de",
                customMessage: $"{shape}: \"{label}\" carries no German sh:name.");
        }
    }
}
