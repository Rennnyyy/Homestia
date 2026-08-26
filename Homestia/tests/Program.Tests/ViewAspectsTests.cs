using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Aletheia.Sdk.Program.Aspects;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;

namespace Aletheia.Sdk.Program.Tests;

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
    public void RegisterViews_registers_property_and_room_into_the_view_family()
    {
        var store = CreateStore();

        Should.NotThrow(() => ViewAspects.RegisterViews(store));

        store.ViewIris.ShouldBe(
            [
                ViewAspects.PropertyShapeIri,
                ViewAspects.RoomShapeIri,
                ViewAspects.AiPropertyShapeIri,
                ViewAspects.AiRoomShapeIri,
            ],
            ignoreOrder: true);
    }

    [Fact]
    public void Ai_shapes_are_lenient_no_required_fields()
    {
        // The AI shapes must NOT require name/address/propertyType — a partial
        // fill must pass so the user completes the rest manually.
        ViewAspects.AiPropertyTtl.ShouldNotContain("sh:minCount 1");
        ViewAspects.AiPropertyTtl.ShouldNotContain("sh:minLength");
        ViewAspects.AiPropertyTtl.ShouldContain("<urn:aletheia:homestia:shapes:room:ai>");

        ViewAspects.AiRoomTtl.ShouldNotContain("sh:minCount 1");
        ViewAspects.AiRoomTtl.ShouldNotContain("sh:minLength");
    }

    [Fact]
    public void Ai_shapes_use_unique_target_classes()
    {
        // The view engine types the value with the shape's first target class
        // and validates against ALL shapes for that class. The AI shapes must
        // therefore target distinct classes so the strict shapes never apply
        // to a partial AI fill.
        ViewAspects.AiPropertyTtl.ShouldContain("<urn:aletheia:homestia:Property:ai>");
        ViewAspects.AiRoomTtl.ShouldContain("<urn:aletheia:homestia:Room:ai>");
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
}
