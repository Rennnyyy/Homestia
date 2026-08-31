using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.Query;

namespace Homestia.Aspects;

/// <summary>
/// Query aspects — read-time derivation of implicit knowledge for the Homestia
/// domain. Where view aspects validate input shapes, query aspects enrich
/// reads: a SPARQL CONSTRUCT bound to each read entity's IRI derives facts
/// from the stored graph and merges them into the response as ordinary JSON
/// fields (Aspects ADR-0009). The browser opts in per request via the
/// <c>X-Aletheia-Query-AspectIri</c> header.
/// </summary>
public static class QueryAspects
{
    /// <summary>IRI of the Rental state aspect.</summary>
    public const string RentalStateQueryAspectIri = "urn:aletheia:homestia:query:rental-state";

    /// <summary>
    /// Derives the lifecycle state of every rental from indirect knowledge —
    /// the stored <c>currentStage</c> reference and whether a tenant has been
    /// assigned — rather than storing the state itself. Enumeration entities
    /// (the rental stages) are never persisted to the graph; their identity
    /// <c>…/rental-stages/{key}</c> is the source of truth, so the construct
    /// reads the stage key from the reference's last path segment. The engine
    /// binds <c>?entityIri</c> to each read rental and merges the derived
    /// <c>state</c> field into the JSON response.
    /// <list type="bullet">
    /// <item><description><c>new</c> — application stage, no tenant assigned yet.</description></item>
    /// <item><description><c>progressing</c> — being set up toward move-in (application with tenant, contract, deposit, handover).</description></item>
    /// <item><description><c>active</c> — currently renting (tenancy).</description></item>
    /// <item><description><c>ending</c> — termination underway (noticed, handback).</description></item>
    /// <item><description><c>closed</c> — finished (terminated).</description></item>
    /// </list>
    /// </summary>
    public const string RentalStateConstruct = """
        CONSTRUCT {
            ?entityIri <https://www.aletheia.arkenforge.de/predicates/rental/state> ?state
        }
        WHERE {
            ?entityIri <https://www.aletheia.arkenforge.de/predicates/rental/currentStage> ?stage .
            BIND(REPLACE(STR(?stage), "^.*/", "") AS ?stageKey)
            OPTIONAL { ?entityIri <https://www.aletheia.arkenforge.de/predicates/rental/tenant> ?tenant }
            BIND(
                IF(?stageKey = "terminated", "closed",
                   IF(?stageKey = "handback" || ?stageKey = "noticed", "ending",
                      IF(?stageKey = "tenancy", "active",
                         IF(?stageKey = "application" && !BOUND(?tenant), "new",
                            "progressing")))) AS ?state)
        }
        """;

    /// <summary>
    /// Registers every query aspect into the SDK's aspect store. Runs alongside
    /// the view registrations before the store seals.
    /// </summary>
    public static void RegisterQueryAspects(IAspectStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        store.RegisterQuery(new InlineTtlQueryAspect(
            RentalStateQueryAspectIri,
            filterWhere: null,
            resultShapeTtl: null,
            enrichmentConstruct: RentalStateConstruct));
    }
}
