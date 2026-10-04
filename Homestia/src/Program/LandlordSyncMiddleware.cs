using System.Collections.Concurrent;
using Aletheia.Sdk.Authorization;
using Aletheia.Sdk.Authorization.Entity;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Entities.RealEstate;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Homestia.Hosting;

/// <summary>
/// Projects the acting agent into the domain record ownership starts at: the caller's own
/// <see cref="Landlord"/>.
/// <br/><br/>
/// Ownership in Homestia is <c>agent → landlord → property → room</c>, and the last three hops are
/// stored data — so the first one has to exist as data too. This is the counterpart of the SDK's
/// agent projection: that one turns a credential into an <see cref="Agent"/> the aspect engines can
/// resolve <c>?agentIri</c> from, and this one gives that agent the landlord it owns through.
/// <br/><br/>
/// <strong>Why the host does it and not the page.</strong> The page cannot name the agent: the IRI
/// is the property-based encoding of a token the browser never sees. Left to the client, a caller
/// with no landlord could not create one, and — because the write gate judges a property by the
/// landlord it carries — could not create a property either. Provisioning here makes the client's
/// whole job "ask the collection for my landlord and bind it", which is exactly what the read gate
/// answers.
/// <br/><br/>
/// Best-effort, like the agent projection: a failure logs a warning and never blocks the request.
/// A caller whose landlord could not be provisioned still reaches every page — they simply own
/// nothing yet. Provisioning is serialized per agent, so simultaneous first requests cannot each
/// create their own landlord.
/// </summary>
internal sealed class LandlordSyncMiddleware(RequestDelegate next, ILogger<LandlordSyncMiddleware> logger)
{
    // One check per agent per UTC day, per process — the same stamp the agent projection keeps, for the
    // same reason: the lookup costs a store round-trip and the answer does not change within a day.
    private readonly ConcurrentDictionary<string, DateOnly> _ensuredOn = new(StringComparer.Ordinal);

    // …plus one gate per agent, because the stamp is checked before the work and written after it — and
    // a burst of simultaneous FIRST requests walks straight through that window: every one of them finds
    // no stamp, scans, and creates its own landlord for the same agent. The read gate then answers with
    // all of them, which is correct but duplicated, and a landlord whose IRI is random cannot collapse
    // them afterwards. Serializing per agent makes the second request find what the first created.
    // Unbounded by design, like the stamp: a host with many identities would evict the idle ones.
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _gates = new(StringComparer.Ordinal);

    public async Task InvokeAsync(HttpContext context)
    {
        // The ambient token is placed by the identity middleware and by the agent projection, which runs
        // before this one. A request without one is anonymous, owns nothing, and is left alone.
        var token = AuthorizationContext.CurrentAgentToken;
        if (!string.IsNullOrWhiteSpace(token))
            await EnsureAsync(context, token);

        await next(context);
    }

    private async Task EnsureAsync(HttpContext context, string token)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (IsEnsuredToday(token, today))
            return;

        var gate = _gates.GetOrAdd(token, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(context.RequestAborted);

        try
        {
            // The request that held the gate may have just provisioned — the whole point of waiting.
            if (IsEnsuredToday(token, today))
                return;

            await EnsureOnceAsync(context, token, today);
        }
        finally
        {
            gate.Release();
        }
    }

    private bool IsEnsuredToday(string token, DateOnly today) =>
        _ensuredOn.TryGetValue(token, out var ensuredOn) && ensuredOn == today;

    private async Task EnsureOnceAsync(HttpContext context, string token, DateOnly today)
    {
        try
        {
            var store = context.RequestServices.GetRequiredService<IEntityStore>();

            // The Operations runtime helpers (bounded to this scope) exercise the full store chain —
            // guard, aspect enforcement, and typed Created events at commit.
            using var _ = EntityOperations.Use(store);

            // Only an identity the platform actually RECORDED can own anything. The gates resolve
            // ?agentIri by matching the ambient token against a stored Agent, so a landlord naming an
            // IRI no agent answers for would be invisible to the very caller that created it.
            var agent = await EntityOperations
                .ReadAsync<Agent>(new Agent { Token = token }.Iri, context.RequestAborted);

            if (agent is null)
                return;

            await foreach (var landlord in store.QueryByTypeAsync<Landlord>(context.RequestAborted))
            {
                if (!string.Equals(landlord.Agent?.Iri, agent.Iri, StringComparison.Ordinal))
                    continue;

                _ensuredOn[token] = today;
                return;
            }

            await EntityOperations.CreateAsync(
                new Landlord { Agent = EntityRef<Agent>.ForIri(agent.Iri) },
                context.RequestAborted);

            logger.LogInformation(
                "Provisioned landlord for agent '{AgentIri}' — the caller owns what it creates from now on.",
                agent.Iri);

            _ensuredOn[token] = today;
        }
        catch (Exception ex)
        {
            logger.LogWarning(
                ex, "Landlord provisioning failed for the acting identity; the request continues.");
        }
    }
}

/// <summary>
/// Pipeline registration for <see cref="LandlordSyncMiddleware"/>.
/// </summary>
internal static class LandlordSyncApplicationBuilderExtensions
{
    /// <summary>
    /// Ensures the acting agent has the landlord it owns through. Must run AFTER the agent projection
    /// (<c>UseAgentSync()</c>) — that is what turns the ambient token into a stored agent — and before
    /// endpoint mapping.
    /// </summary>
    public static IApplicationBuilder UseLandlordSync(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<LandlordSyncMiddleware>();
    }
}
