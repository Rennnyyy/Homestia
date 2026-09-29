using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Aspects;
using Homestia.Entities.RealEstate;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using System.Text.RegularExpressions;

namespace Homestia.Tests;

/// <summary>
/// Unit tests for <see cref="OperationAspects"/> — the write-side counterparts of
/// Homestia's views.
/// <br/><br/>
/// The load-bearing test is <see cref="Every_view_field_is_writable"/>: the server
/// ignores any body field an operation aspect does not name, silently and with a
/// 200. A view that gains a field its operation shape does not admit would break
/// saving with no error anywhere — these tests are that failure, moved to build
/// time. They compare <strong>predicate IRIs</strong>, not field names, because
/// that is what the write filter matches: a shape in the wrong namespace (the
/// <c>json:</c> prefix a view uses, for instance) mentions nothing that binds and
/// drops every field of the write.
/// </summary>
public sealed class OperationAspectsTests
{
    private static IAspectStore CreateStore()
    {
        var services = new ServiceCollection();
        services.AddAspects();
        return services.BuildServiceProvider().GetRequiredService<IAspectStore>();
    }

    /// <summary>
    /// Every shape a form can save from, the entity the write reaches, and the
    /// field set that must admit it. A view missing from this table would be
    /// unguarded on write — <see cref="Every_view_shape_is_covered"/> closes that.
    /// </summary>
    public static TheoryData<string, Type, string[]> ViewToOperation() => new()
    {
        { ViewAspects.PropertyTtl, typeof(Property), OperationAspects.PropertyWritableFields },
        { ViewAspects.RoomTtl, typeof(Room), OperationAspects.RoomWritableFields },
        { ViewAspects.TenantTtl, typeof(Tenant), OperationAspects.TenantWritableFields },
        { ViewAspects.RentalApplicationTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalContractTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalDepositTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalHandoverTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalTenancyTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalNoticedTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalHandbackTtl, typeof(Rental), OperationAspects.RentalWritableFields },
        { ViewAspects.RentalTerminatedTtl, typeof(Rental), OperationAspects.RentalWritableFields },
    };

    /// <summary>The JSON field names a view shape declares.</summary>
    private static string[] ViewFieldsOf(string ttl) =>
        Regex.Matches(ttl, @"sh:path\s+json:([A-Za-z0-9_]+)")
            .Select(match => match.Groups[1].Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    /// <summary>The predicate IRIs a shape names.</summary>
    private static string[] PathsOf(string shape) =>
        Regex.Matches(shape, @"sh:path\s+<([^>]+)>")
            .Select(match => match.Groups[1].Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    /// <summary>The shape a save runs under — the aggregate for the property, one entity otherwise.</summary>
    private static string ShapeAdmitting(Type entity) => entity switch
    {
        var t when t == typeof(Property) || t == typeof(Room) => OperationAspects.ShapeFor(
            OperationAspects.PropertyOperationIri,
            (typeof(Property), OperationAspects.PropertyWritableFields),
            (typeof(Room), OperationAspects.RoomWritableFields)),
        var t when t == typeof(Tenant) => OperationAspects.ShapeFor(
            OperationAspects.TenantOperationIri,
            (typeof(Tenant), OperationAspects.TenantWritableFields)),
        _ => OperationAspects.ShapeFor(
            OperationAspects.RentalOperationIri,
            (typeof(Rental), OperationAspects.RentalWritableFields)),
    };

    [Theory]
    [MemberData(nameof(ViewToOperation))]
    public void Every_view_field_is_writable(string viewTtl, Type entity, string[] writable)
    {
        var predicates = EntityQueryPredicates.ResolvePredicateIris(entity);
        var shape = ShapeAdmitting(entity);

        foreach (var field in ViewFieldsOf(viewTtl))
        {
            var name = OperationAspects.PropertyNameFor(field);
            name.ShouldNotBeNull($"the view field '{field}' belongs to no writable property");
            writable.ShouldContain(name);

            predicates.ContainsKey(name).ShouldBeTrue(
                $"{entity.Name}.{name} is not a predicate, so no write could ever set it");
            shape.ShouldContain(
                $"<{predicates[name]}>",
                customMessage: $"the operation shape does not name {entity.Name}.{name} — a write " +
                    "selecting the aspect would silently drop it");
        }
    }

    [Fact]
    public void Every_view_shape_is_covered()
    {
        var covered = ViewToOperation()
            .Select(row => (string)row[0]!)
            .ToHashSet(StringComparer.Ordinal);

        ViewAspectsTests.ServedShapes()
            .Select(row => (string)row[1]!)
            // The query result shape is a read shape — not a write origin.
            .Where(ttl => ttl != QueryAspects.RentalStateResultShapeTtl)
            .Where(ttl => !covered.Contains(ttl))
            .ShouldBeEmpty("every view a form can save from needs an operation aspect that admits its fields");
    }

    [Fact]
    public void Shape_paths_are_the_entities_own_vocabulary()
    {
        // The bug this guards: a shape written with the `json:` namespace a view
        // uses mentions nothing the write filter can bind to, so a save returns
        // 200 and changes nothing.
        var shape = ShapeAdmitting(typeof(Room));
        var predicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Room));

        shape.ShouldNotContain("json:", Case.Insensitive);
        shape.ShouldContain($"<{predicates["RoomSize"]}>");
        // The room's writes run through the property aggregate, so the shape
        // carries both halves — the two `Name` properties resolve to two distinct
        // predicate IRIs, one per type.
        PathsOf(shape).Count().ShouldBe(
            OperationAspects.PropertyWritableFields.Length + OperationAspects.RoomWritableFields.Length);
    }

    [Fact]
    public void A_field_that_is_no_predicate_fails_at_registration()
    {
        // Naming a field an entity does not have must throw here — the moment the
        // aspect is built — rather than silently narrowing what a user can save.
        Should.Throw<InvalidOperationException>(() =>
            OperationAspects.ShapeFor("urn:test:bad", (typeof(Room), ["NoSuchProperty"])));
    }

    [Fact]
    public void Structural_fields_no_view_shows_are_still_writable()
    {
        // The forms never render these, but the writes always send them: a room
        // without IsPartOf is parentless, a rental without CurrentStage loses the
        // stage the user stopped at.
        OperationAspects.RoomWritableFields.ShouldContain("IsPartOf");
        OperationAspects.RentalWritableFields.ShouldContain("CurrentStage");
    }

    [Fact]
    public void The_property_aspect_admits_both_halves_of_the_save()
    {
        // One save writes the property and its rooms, so one aspect governs it: a
        // property-only shape would empty every room the save carries.
        var shape = ShapeAdmitting(typeof(Property));
        foreach (var field in OperationAspects.RoomWritableFields)
        {
            var iri = EntityQueryPredicates.ResolvePredicateIris(typeof(Room))[field];
            shape.ShouldContain($"<{iri}>");
        }
    }

    [Fact]
    public void Rental_writable_fields_cover_every_stage_at_once()
    {
        // A rental is PUT whole on every stage save, so the union is the only safe
        // shape: a per-stage aspect would erase the stages already filled.
        var union = ViewToOperation()
            .Where(row => row[1] is Type t && t == typeof(Rental))
            .SelectMany(row => ViewFieldsOf((string)row[0]!))
            .Select(OperationAspects.PropertyNameFor)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        union.Length.ShouldBeGreaterThan(10);
        union.Where(field => !OperationAspects.RentalWritableFields.Contains(field)).ShouldBeEmpty();
    }

    [Fact]
    public void RegisterOperationAspects_registers_the_full_operation_family()
    {
        var store = CreateStore();

        Should.NotThrow(() => OperationAspects.RegisterOperationAspects(store));

        store.OperationIris.ShouldBe(
            [
                OperationAspects.PropertyOperationIri,
                OperationAspects.TenantOperationIri,
                OperationAspects.RentalOperationIri,
            ],
            ignoreOrder: true);
    }

    [Fact]
    public void Operation_aspects_stay_out_of_the_other_families()
    {
        var store = CreateStore();
        ViewAspects.RegisterViews(store);
        QueryAspects.RegisterQueryAspects(store);
        OperationAspects.RegisterOperationAspects(store);

        store.ViewIris.ShouldNotContain(OperationAspects.PropertyOperationIri);
        store.QueryIris.ShouldNotContain(OperationAspects.PropertyOperationIri);
    }

    [Fact]
    public void A_shape_is_valid_turtle()
    {
        // The store parses a shape at registration, so a stray trailing separator
        // throws there. Asserted on the text as well, because the failure would
        // otherwise only surface at host startup.
        var shape = ShapeAdmitting(typeof(Tenant));

        shape.TrimEnd().ShouldEndWith(".");
        shape.ShouldNotContain("; .");
        PathsOf(shape).Count().ShouldBe(OperationAspects.TenantWritableFields.Length);
    }
}
