using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Aletheia.Sdk.Aspects.Query;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Program.Aspects;
using Aletheia.Sdk.Program.Entities.RealEstate;
using Aletheia.Sdk.Repository;
using Aletheia.Sdk.Repository.Contracts;
using Aletheia.Sdk.Repository.DependencyInjection;
using Aletheia.Sdk.Repository.InMemory.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;

namespace Aletheia.Sdk.Program.Tests;

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
            ApplicationDate = "2026-01-01",
            Rent = 900,
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
