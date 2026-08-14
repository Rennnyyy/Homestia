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
            [ViewAspects.PropertyShapeIri, ViewAspects.RoomShapeIri],
            ignoreOrder: true);
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
