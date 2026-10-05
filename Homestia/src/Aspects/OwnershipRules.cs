using Aletheia.Sdk.Repository.Contracts;
using Homestia.Entities.RealEstate;

namespace Homestia.Aspects;

/// <summary>
/// The ownership rules the read gate and the write gate share.
/// <br/><br/>
/// A property belongs to the landlord it carries; a room belongs to the landlord of the property
/// it is part of; a rental belongs to the landlord of the property it is for; a landlord belongs
/// to the agent the platform infuses as <c>?agentIri</c>. Both gates are written from that one
/// sentence, because a property a caller may read but not change — or the reverse — is not a rule
/// anyone could state.
/// <list type="bullet">
/// <item><description><strong>The read gate</strong> is an ALLOW clause: a query aspect's
/// <c>FilterWhere</c> admits a row when the acting agent owns the record. The engine wraps it in
/// <c>SELECT ?granted … BIND(true AS ?granted)</c>, so "no solution" is the refusal — the clause
/// states ownership, not its absence.</description></item>
/// <item><description><strong>The write gate</strong> is a DENIAL clause: an operation aspect's
/// <c>ContextWhere</c> produces a row per violation. Same sentence, opposite polarity, and the
/// reason the two fragments cannot share a literal.</description></item>
/// </list>
/// Both are written over <c>?entityIri</c> — the entity the call is about, bound by the engine —
/// so the same rule serves a point read, a list scan and a write.
/// <br/><br/>
/// <strong>A create is not gated, it is bound.</strong> The context pass runs before the
/// operation's own triples land, so a record that does not exist yet cannot be judged by what it
/// will hold. The write gate therefore applies to a record that ALREADY exists (an update or a
/// delete), while a create is made reachable by the caller that creates it — which is exactly what
/// binding the current agent's landlord to a new property does. A room created inside another
/// agent's property is refused one entity up: the aggregate save writes the property too, and the
/// property's own gate judges it.
/// </summary>
internal static class OwnershipRules
{
    /// <summary>
    /// The predicate a property names its landlord with — the predicate a property read and a
    /// property write are both judged by.
    /// </summary>
    public static string PropertyLandlord { get; } = PredicateOf(typeof(Property), nameof(Property.Landlord));

    /// <summary>The predicate a landlord names its agent with.</summary>
    public static string LandlordAgent { get; } = PredicateOf(typeof(Landlord), nameof(Landlord.Agent));

    /// <summary>The predicate a room names its property with — the first hop of the room's rule.</summary>
    public static string RoomParent { get; } = PredicateOf(typeof(Room), nameof(Room.IsPartOf));

    /// <summary>The predicate a rental names its property with — the first hop of the rental's rule.</summary>
    public static string RentalProperty { get; } = PredicateOf(typeof(Rental), nameof(Rental.Property));

    /// <summary>
    /// A property is owned by <c>?agentIri</c> when the landlord it carries names that agent.
    /// </summary>
    public static string PropertyOwnedByAgent { get; } =
        $"?entityIri <{PropertyLandlord}> ?landlord . ?landlord <{LandlordAgent}> ?agentIri .";

    /// <summary>
    /// A room is owned by <c>?agentIri</c> when its property's landlord names that agent — the
    /// room reaches a landlord only through the property it is part of.
    /// </summary>
    public static string RoomOwnedByAgent { get; } =
        $"?entityIri <{RoomParent}> ?property . ?property <{PropertyLandlord}> ?landlord . " +
        $"?landlord <{LandlordAgent}> ?agentIri .";

    /// <summary>
    /// A rental is owned by <c>?agentIri</c> when the property it is for belongs to that agent's
    /// landlord. A rental reaches a landlord the same way a room does — through the property it
    /// references — so an agent's rentals are exactly the ones its properties carry, and no
    /// rental is reachable through the tenant it names.
    /// </summary>
    public static string RentalOwnedByAgent { get; } =
        $"?entityIri <{RentalProperty}> ?property . ?property <{PropertyLandlord}> ?landlord . " +
        $"?landlord <{LandlordAgent}> ?agentIri .";

    /// <summary>
    /// A landlord is owned by <c>?agentIri</c> when it names that agent — the rule that keeps one
    /// landlord's properties from being listed through another's record.
    /// </summary>
    public static string LandlordOwnedByAgent { get; } =
        $"?entityIri <{LandlordAgent}> ?agentIri .";

    /// <summary>
    /// The access gate of a read: rows survive when the acting agent owns the record. An
    /// <em>unbound</em> agent — local development, or a deployment with no Authentik in front —
    /// leaves the gate open, which is the platform's permissive default and the only reading that
    /// keeps a store without identities usable.
    /// </summary>
    /// <param name="ownedByAgent">The ownership pattern, over <c>?entityIri</c> and
    /// <c>?agentIri</c>.</param>
    public static string AllowFilter(string ownedByAgent)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownedByAgent);
        return $"FILTER(!bound(?agentIri) || EXISTS {{ {ownedByAgent} }})";
    }

    /// <summary>
    /// The access gate of a read whose answer IS the caller's identity — the caller's own record,
    /// rather than a collection of records it is allowed to see.
    /// <br/><br/>
    /// The distinction matters because the caller reads the answer as "this is mine": a page binds the
    /// landlord it is given. The permissive default would hand an anonymous caller the first landlord in
    /// the store — somebody else's — so this gate is the one that treats an unknown agent as "none",
    /// which is also the only honest answer to "which of these is me".
    /// </summary>
    /// <param name="ownedByAgent">The ownership pattern, over <c>?entityIri</c> and
    /// <c>?agentIri</c>.</param>
    public static string RequireOwnFilter(string ownedByAgent)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownedByAgent);
        return $"FILTER(bound(?agentIri) && EXISTS {{ {ownedByAgent} }})";
    }

    /// <summary>
    /// The denial clause of a write: a row — hence a violation — exactly when the acting agent is
    /// known, the record already exists, and that agent does not own it. The three conditions are
    /// the whole rule, in the order that makes each cheap: an unknown agent is the permissive
    /// default, a record that does not exist yet is a create (see the type remarks), and only what
    /// is left is judged.
    /// </summary>
    /// <param name="ownedByAgent">The ownership pattern, over <c>?entityIri</c> and
    /// <c>?agentIri</c>.</param>
    /// <param name="message">The violation as the caller reads it.</param>
    public static string DenyViolation(string ownedByAgent, string message)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(ownedByAgent);
        ArgumentException.ThrowIfNullOrWhiteSpace(message);

        return $$"""
            FILTER(bound(?agentIri))
            FILTER EXISTS { ?entityIri ?anyPredicate ?anyObject }
            FILTER NOT EXISTS { {{ownedByAgent}} }
            BIND(?entityIri AS ?focusNode)
            BIND("{{message}}" AS ?message)
            """;
    }

    /// <summary>
    /// Resolves the predicate IRI of an entity's property from the entity itself. Hand-writing the
    /// IRI would let a rename leave a gate pointing at a predicate nothing stores — and a gate that
    /// mentions nothing binds nothing, which fails OPEN.
    /// </summary>
    private static string PredicateOf(Type entity, string property)
    {
        ArgumentNullException.ThrowIfNull(entity);
        ArgumentException.ThrowIfNullOrWhiteSpace(property);

        return EntityQueryPredicates.ResolvePredicateIris(entity).TryGetValue(property, out var iri)
            ? iri
            : throw new InvalidOperationException(
                $"'{property}' is not a predicate of {entity.Name}: ownership cannot be expressed " +
                "with it, and a gate that mentions nothing would admit every caller.");
    }
}
