using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.Abstractions.Exceptions;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Aletheia.Sdk.Aspects.Query;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Homestia.Aspects;
using Homestia.Entities.RealEstate;
using Aletheia.Sdk.Repository;
using Aletheia.Sdk.Repository.Contracts;
using Aletheia.Sdk.Repository.DependencyInjection;
using Aletheia.Sdk.Repository.InMemory.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using System.Text.RegularExpressions;

namespace Homestia.Tests;

/// <summary>
/// Tests for <see cref="QueryAspects"/> — read-time enrichment that derives the
/// rental lifecycle state from indirect knowledge (the <c>currentStage</c>
/// reference and tenant presence) instead of storing the state itself. The
/// browser opts in per request via the <c>X-Aletheia-Query-AspectIri</c> header;
/// the engine binds <c>?entityIri</c> and merges the derived <c>state</c> field
/// into the read entities (Aspects ADR-0009).
/// </summary>
public sealed class QueryAspectsTests
{
    static QueryAspectsTests() => EntityOptions.BaseIri = "https://homestia.katharsis.digital";

    private static ServiceProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.Configure<EntityRepositoryOptions>(_ => { });
        services.AddEntityRepository().UseInMemory();
        services.AddAspects();
        var sp = services.BuildServiceProvider();
        QueryAspects.RegisterQueryAspects(sp.GetRequiredService<IAspectStore>());
        return sp;
    }

    private static async Task SaveRentalAsync(IEntityStore store, string stageKey, bool withTenant)
    {
        var rental = new Rental
        {
            ViewingDate = "2026-01-15",
            CurrentStage = EntityRef<RentalStage>.ForIri(
                $"https://www.aletheia.arkenforge.de/rental-stages/{stageKey}"),
        };
        if (withTenant)
        {
            rental.Tenant = EntityRef<Tenant>.ForIri("https://www.aletheia.arkenforge.de/tenants/demo-1");
        }
        await store.SaveAsync(rental, WriteMode.Create);
    }

    private static string? StateOf(Rental rental)
        => rental.Enrichment is not null && rental.Enrichment.TryGetValue("state", out var s)
            ? s as string
            : null;

    [Fact]
    public void RegisterQueryAspects_registers_the_rental_state_aspect()
    {
        var store = BuildProvider().GetRequiredService<IAspectStore>();

        store.TryResolveQuery(QueryAspects.RentalStateQueryAspectIri).ShouldNotBeNull();
    }

    [Fact]
    public void RegisterQueryAspects_registers_every_read_aspect()
    {
        var store = BuildProvider().GetRequiredService<IAspectStore>();

        store.TryResolveQuery(QueryAspects.PropertyQueryAspectIri).ShouldNotBeNull();
        store.TryResolveQuery(QueryAspects.RoomQueryAspectIri).ShouldNotBeNull();
        store.TryResolveQuery(QueryAspects.TenantQueryAspectIri).ShouldNotBeNull();
        store.TryResolveQuery(QueryAspects.LandlordQueryAspectIri).ShouldNotBeNull();
    }

    /// <summary>
    /// The read gates state ownership as an ALLOW clause, because that is the polarity the access
    /// gate reads: it runs <c>SELECT ?granted … BIND(true AS ?granted)</c> and every returned row is
    /// a GRANT. A filter written as a denial would therefore admit exactly the callers it means to
    /// refuse — and would still look like a gate.
    /// <br/><br/>
    /// <c>!bound(?agentIri)</c> rides along: an anonymous caller is the platform's permissive
    /// default, and a store with no identities in it would otherwise become unreadable.
    /// </summary>
    [Fact]
    public void The_read_gates_admit_only_the_connected_landlord()
    {
        var store = BuildProvider().GetRequiredService<IAspectStore>();

        var propertyPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Property));
        var roomPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Room));
        var landlordPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Landlord));

        string FilterOf(string iri) => store.TryResolveQuery(iri)?.FilterWhere
            ?? throw new InvalidOperationException($"'{iri}' carries no ownership filter.");

        // A property: the landlord it carries names the acting agent.
        var property = FilterOf(QueryAspects.PropertyQueryAspectIri);
        property.ShouldContain($"EXISTS {{ ?entityIri <{propertyPredicates["Landlord"]}> ?landlord");
        property.ShouldContain($"<{landlordPredicates["Agent"]}> ?agentIri");

        // A room: same rule, reached through the property it is part of.
        var room = FilterOf(QueryAspects.RoomQueryAspectIri);
        room.ShouldContain($"?entityIri <{roomPredicates["IsPartOf"]}> ?property");
        room.ShouldContain($"?property <{propertyPredicates["Landlord"]}> ?landlord");

        // A landlord: the record that names the acting agent — and only for a caller that IS an agent.
        // The page reads this answer as "this is mine", so an anonymous caller must be answered with
        // nothing rather than with the first landlord in the store.
        var landlordFilter = FilterOf(QueryAspects.LandlordQueryAspectIri);
        landlordFilter.ShouldContain($"?entityIri <{landlordPredicates["Agent"]}> ?agentIri");
        landlordFilter.ShouldContain("bound(?agentIri) &&");

        foreach (var filter in new[] { property, room })
        {
            filter.ShouldContain("!bound(?agentIri)");
            filter.ShouldNotContain("FILTER NOT EXISTS");
        }

        // The tenant and rental reads stay ungated — ownership never scoped them, and a filter
        // bolted on here would quietly change what those pages can see.
        store.TryResolveQuery(QueryAspects.TenantQueryAspectIri)!.FilterWhere.ShouldBeNull();
        store.TryResolveQuery(QueryAspects.RentalStateQueryAspectIri)!.FilterWhere.ShouldBeNull();
    }

    /// <summary>Every read surface and the entity it returns.</summary>
    public static TheoryData<string, Type> QueryAspectsAndTheirEntities() => new()
    {
        { QueryAspects.PropertyQueryAspectIri, typeof(Property) },
        { QueryAspects.RoomQueryAspectIri, typeof(Room) },
        { QueryAspects.TenantQueryAspectIri, typeof(Tenant) },
        { QueryAspects.LandlordQueryAspectIri, typeof(Landlord) },
        { QueryAspects.RentalStateQueryAspectIri, typeof(Rental) },
    };

    /// <summary>
    /// Every query aspect declares the response it returns. This matters twice: a declared result
    /// shape IS the projection, so a predicate it omits is cleared from the response — silently —
    /// and the exploration endpoint (<c>GET …/aletheia/aspects/{iri}/view</c>) serves that shape,
    /// so an aspect without one answers 404.
    /// </summary>
    [Theory]
    [MemberData(nameof(QueryAspectsAndTheirEntities))]
    public void Every_query_aspect_declares_the_whole_vocabulary(string aspectIri, Type entity)
    {
        var store = BuildProvider().GetRequiredService<IAspectStore>();
        var aspect = store.TryResolveQuery(aspectIri);

        aspect.ShouldNotBeNull();
        aspect!.ResultShapeTtl.ShouldNotBeNullOrWhiteSpace(
            $"'{aspectIri}' declares no result shape: a read would return the record undescribed, " +
            "and the admin's aspect page would answer 404 for its shape");

        var declared = Regex.Matches(aspect.ResultShapeTtl!, @"sh:path\s+<([^>]+)>")
            .Select(match => match.Groups[1].Value)
            .ToHashSet(StringComparer.Ordinal);

        foreach (var (property, predicate) in EntityQueryPredicates.ResolvePredicateIris(entity))
        {
            declared.ShouldContain(
                predicate,
                $"a read under '{aspectIri}' would silently clear {entity.Name}.{property}");
        }

        // No rule rides along: a read must not be judged the way a write is, or a stored record
        // that predates a rule would become unreadable.
        aspect.ResultShapeTtl!.ShouldNotContain("sh:minCount");
        aspect.ResultShapeTtl!.ShouldNotContain("sh:minLength");
        aspect.ResultShapeTtl!.ShouldNotContain("sh:datatype");
    }

    [Fact]
    public void The_rental_state_shape_names_the_derived_field_it_returns()
    {
        // A projection clears what the shape does not mention, so the derived field must be named
        // — it is the one field the shape introduces rather than inherits, which is also why it is
        // the one property the shape has to label.
        var shape = BuildProvider().GetRequiredService<IAspectStore>()
            .TryResolveQuery(QueryAspects.RentalStateQueryAspectIri)!.ResultShapeTtl;

        shape.ShouldNotBeNull();
        shape!.ShouldContain(QueryAspects.RentalStatePredicate);
        shape.ShouldContain("sh:name \"State\"@en");
    }

    [Fact]
    public async Task A_read_accepts_a_conforming_record()
    {
        await using var sp = BuildProvider();
        var store = sp.GetRequiredService<IEntityStore>();

        await store.SaveAsync(
            new Property
            {
                Name = "Loft",
                Address = "Bahnhofstrasse 1",
                PropertyType = EntityRef<PropertyType>.ForIri("https://example.test/property-types/flat"),
            },
            WriteMode.Create);

        using var _ = QueryAspectScope.Use(QueryAspects.PropertyQueryAspectIri);

        var read = new List<Property>();
        await foreach (var property in store.QueryByTypeAsync<Property>())
            read.Add(property);

        read.Count.ShouldBe(1);
        read[0].Name.ShouldBe("Loft");
        read[0].Address.ShouldBe("Bahnhofstrasse 1");
    }

    [Fact]
    public async Task A_read_runs_under_its_access_aspect_without_projecting_the_record()
    {
        await using var sp = BuildProvider();
        var store = sp.GetRequiredService<IEntityStore>();

        // IsCommonArea is persisted but no property form shows it, and the name is empty — a rule
        // the write gate would reject. The read gate is an ACCESS surface, not a judge and not a
        // projection: it returns the record whole.
        await store.SaveAsync(
            new Property
            {
                Name = string.Empty,
                Address = "Bahnhofstrasse 1",
                PropertyType = EntityRef<PropertyType>.ForIri("https://example.test/property-types/flat"),
                IsCommonArea = true,
            },
            WriteMode.Create);

        using var _ = QueryAspectScope.Use(QueryAspects.PropertyQueryAspectIri);

        var read = new List<Property>();
        await foreach (var property in store.QueryByTypeAsync<Property>())
            read.Add(property);

        read.Count.ShouldBe(1);
        read[0].IsCommonArea.ShouldBeTrue();
        read[0].Address.ShouldBe("Bahnhofstrasse 1");
    }

    [Fact]
    public async Task RentalState_enrichment_derives_states_from_the_stage_reference()
    {
        await using var sp = BuildProvider();
        var store = sp.GetRequiredService<IEntityStore>();

        // application without tenant → new; application with tenant → progressing
        await SaveRentalAsync(store, "application", withTenant: false);
        await SaveRentalAsync(store, "application", withTenant: true);
        // contract / deposit / handover → progressing
        await SaveRentalAsync(store, "deposit", withTenant: true);
        // tenancy → active
        await SaveRentalAsync(store, "tenancy", withTenant: true);
        // noticed / handback → ending
        await SaveRentalAsync(store, "noticed", withTenant: true);
        // terminated → closed
        await SaveRentalAsync(store, "terminated", withTenant: true);

        using var _ = QueryAspectScope.Use(QueryAspects.RentalStateQueryAspectIri);
        var results = new List<Rental>();
        await foreach (var rental in store.QueryByTypeAsync<Rental>())
            results.Add(rental);

        results.Count.ShouldBe(6);
        results.Select(StateOf).ShouldBe(
            ["new", "progressing", "progressing", "active", "ending", "closed"]);
    }

    [Fact]
    public async Task RentalState_enrichment_requires_an_active_scope()
    {
        await using var sp = BuildProvider();
        var store = sp.GetRequiredService<IEntityStore>();
        await SaveRentalAsync(store, "tenancy", withTenant: true);

        // No QueryAspectScope — the enrichment pass must not run.
        var results = new List<Rental>();
        await foreach (var rental in store.QueryByTypeAsync<Rental>())
            results.Add(rental);

        StateOf(results.Single()).ShouldBeNull();
    }
}
