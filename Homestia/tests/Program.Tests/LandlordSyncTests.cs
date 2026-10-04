using Aletheia.Sdk.Authorization;
using Aletheia.Sdk.Authorization.Entity;
using Aletheia.Sdk.Operations;
using Aletheia.Sdk.Repository.Contracts;
using Aletheia.Sdk.Repository.DependencyInjection;
using Aletheia.Sdk.Repository.InMemory.DependencyInjection;
using Homestia.Entities.RealEstate;
using Homestia.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;

namespace Homestia.Tests;

/// <summary>
/// The landlord projection — the one record Homestia's ownership chain starts at.
/// <br/><br/>
/// A landlord is found-or-created for the acting agent, and the finding is the interesting half: the
/// store is shared, the caller is not, and the record is what the read gate answers with. What these
/// tests lock is that an agent ends up with exactly ONE landlord — however many requests arrive at
/// once, and however many times the caller comes back.
/// </summary>
public sealed class LandlordSyncTests
{
    private static ServiceProvider BuildServices()
    {
        var configuration = new ConfigurationBuilder().Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddEntityRepository(configuration).UseInMemory();
        return services.BuildServiceProvider();
    }

    private static DefaultHttpContext ContextFor(ServiceProvider services) =>
        new() { RequestServices = services };

    /// <summary>
    /// Stores the agent the projection looks for: only an identity the platform RECORDED can own
    /// anything, so a test of provisioning has to begin where the SDK's agent projection would leave it.
    /// </summary>
    private static async Task<Agent> StoreAgentAsync(IEntityStore store, string token)
    {
        using var _ = EntityOperations.Use(store);
        var agent = new Agent { Token = token, DisplayName = token };
        await EntityOperations.CreateAsync(agent);
        return agent;
    }

    private static async Task<IReadOnlyList<Landlord>> LandlordsAsync(IEntityStore store)
    {
        var landlords = new List<Landlord>();
        await foreach (var landlord in store.QueryByTypeAsync<Landlord>())
            landlords.Add(landlord);

        return landlords;
    }

    [Fact]
    public async Task A_burst_of_first_requests_provisions_one_landlord()
    {
        var services = BuildServices();
        var store = services.GetRequiredService<IEntityStore>();
        var agent = await StoreAgentAsync(store, "burst");

        // The first thing a browser does after a reload is fire several queries at once — the same
        // identity, the same missing landlord, and no stamp yet on any of them.
        var middleware = new LandlordSyncMiddleware(_ => Task.CompletedTask, NullLogger<LandlordSyncMiddleware>.Instance);

        // Each request gets its own thread, which is what the host does: the burst is genuine
        // parallelism, so the stamp check, the scan and the create of one request overlap another's.
        var requests = Enumerable.Range(0, 8).Select(_ => Task.Run(async () =>
        {
            using (AuthorizationContext.Use("burst"))
                await middleware.InvokeAsync(ContextFor(services));
        })).ToArray();

        await Task.WhenAll(requests);

        var landlords = await LandlordsAsync(store);
        landlords.Count.ShouldBe(1, "one identity owns through exactly one landlord");
        landlords[0].Agent?.Iri.ShouldBe(agent.Iri);
    }

    [Fact]
    public async Task A_later_request_reuses_the_landlord()
    {
        var services = BuildServices();
        var store = services.GetRequiredService<IEntityStore>();
        await StoreAgentAsync(store, "alice");

        var middleware = new LandlordSyncMiddleware(_ => Task.CompletedTask, NullLogger<LandlordSyncMiddleware>.Instance);
        using (AuthorizationContext.Use("alice"))
        {
            await middleware.InvokeAsync(ContextFor(services));
            await middleware.InvokeAsync(ContextFor(services));
        }

        (await LandlordsAsync(store)).Count.ShouldBe(1);
    }

    [Fact]
    public async Task Two_identities_own_through_two_landlords()
    {
        var services = BuildServices();
        var store = services.GetRequiredService<IEntityStore>();
        var alice = await StoreAgentAsync(store, "alice");
        var bob = await StoreAgentAsync(store, "bob");

        var middleware = new LandlordSyncMiddleware(_ => Task.CompletedTask, NullLogger<LandlordSyncMiddleware>.Instance);

        // The ambient scope is what the identity middleware establishes per request — one identity per
        // request, which is why the middleware reads it rather than a parameter.
        using (AuthorizationContext.Use("alice"))
            await middleware.InvokeAsync(ContextFor(services));
        using (AuthorizationContext.Use("bob"))
            await middleware.InvokeAsync(ContextFor(services));

        var landlords = await LandlordsAsync(store);
        landlords.Count.ShouldBe(2);
        landlords.Select(landlord => landlord.Agent?.Iri).OrderBy(iri => iri, StringComparer.Ordinal)
            .ShouldBe(new[] { alice.Iri, bob.Iri }.OrderBy(iri => iri, StringComparer.Ordinal));
    }

    [Fact]
    public async Task An_anonymous_request_provisions_nothing()
    {
        var services = BuildServices();
        var store = services.GetRequiredService<IEntityStore>();
        await StoreAgentAsync(store, "alice");

        var middleware = new LandlordSyncMiddleware(_ => Task.CompletedTask, NullLogger<LandlordSyncMiddleware>.Instance);
        await middleware.InvokeAsync(ContextFor(services));

        (await LandlordsAsync(store)).ShouldBeEmpty();
    }
}
