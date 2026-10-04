using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Entities.RealEstate;

namespace Homestia.Aspects;

/// <summary>
/// One entity field's validation rule — the single description of what a value must be.
/// The <strong>operation</strong> shapes render it for the write path (the server's gate),
/// and a <strong>view</strong> carries the same rule for the form the user sees; a
/// conformance test asserts the two agree, because the form is only the first gate — the
/// operation aspect is the one a caller cannot bypass. A <strong>query</strong> aspect is a
/// narrow access surface (which entity, which caller), never a second copy of these rules.
/// </summary>
public sealed record AspectField(
    string Name,
    int? MinCount = null,
    int? MinLength = null,
    string? Datatype = null,
    bool IsIri = false,
    decimal? MinInclusive = null,
    decimal? MaxInclusive = null,
    bool IsOwningCollection = false)
{
    /// <summary>
    /// The SHACL constraint terms of this field, in a stable order. <c>sh:minCount</c> is emitted
    /// when the rule declares it: presence is a rule like any other, and whether a field carries
    /// one is decided where the field is declared — for a rental, per stage.
    /// <br/><br/>
    /// An <see cref="IsOwningCollection"/> field is the one case where the two vocabularies differ:
    /// a <em>view</em> sees a JSON array of IRI strings, but the STORED graph holds an
    /// <c>rdf:List</c> — its head is a blank node when the collection has members, and <c>rdf:nil</c>
    /// (an IRI) when it is empty. So <c>sh:nodeKind sh:IRI</c> on such a predicate accepts the
    /// EMPTY list and rejects a non-empty one, and <c>sh:minCount 1</c> is satisfied by the
    /// <c>rdf:nil</c> triple. <c>sh:nodeKind sh:BlankNode</c> is the term that says "at least one
    /// member", which is why presence is expressed through it and not through a count.
    /// </summary>
    public IEnumerable<string> Terms()
    {
        if (MinCount is { } minCount) yield return $"sh:minCount {minCount}";
        if (MinLength is { } minLength) yield return $"sh:minLength {minLength}";
        if (Datatype is { } datatype) yield return $"sh:datatype {datatype}";
        if (IsOwningCollection) yield return "sh:nodeKind sh:BlankNode";
        else if (IsIri) yield return "sh:nodeKind sh:IRI";
        if (MinInclusive is { } min) yield return $"sh:minInclusive {min}";
        if (MaxInclusive is { } max) yield return $"sh:maxInclusive {max}";
    }
}

/// <summary>
/// The field vocabulary shared by the operation, query and view aspects — the one place a
/// rule is described, so the write gate, the read gate and the form cannot drift apart.
/// </summary>
internal static class AspectFields
{
    public const string XsdString = "xsd:string";
    public const string XsdDecimal = "xsd:decimal";
    public const string XsdBoolean = "xsd:boolean";

    private static readonly IReadOnlyList<AspectField> PropertyFields =
    [
        new("Name", MinCount: 1, MinLength: 1, Datatype: XsdString),
        new("Address", MinCount: 1, MinLength: 5, Datatype: XsdString),
        new("PropertyType", MinCount: 1, IsIri: true),
        new("RentalModel", IsIri: true),
        // The owning side of the ownership link: the landlord a property is judged against.
        // No form shows it — the page binds the caller's own landlord when it creates the
        // property — but a write that omits it would leave the property unreachable, so the
        // field is part of the writable surface even though it is not part of the view.
        new("Landlord", IsIri: true),
    ];

    private static readonly IReadOnlyList<AspectField> RoomFields =
    [
        new("Name", MinCount: 1, MinLength: 1, Datatype: XsdString),
        new("Location", MinLength: 2, Datatype: XsdString),
        new("RoomSize", Datatype: XsdDecimal, MinInclusive: 1, MaxInclusive: 1000),
        new("FurnishingStatus", IsIri: true),
        new("RoomStatus", IsIri: true),
    ];

    private static readonly IReadOnlyList<AspectField> TenantFields =
    [
        new("DisplayName", MinCount: 1, MinLength: 1, Datatype: XsdString),
        new("Email", Datatype: XsdString),
        new("Phone", Datatype: XsdString),
    ];

    /// <summary>
    /// A landlord's writable surface: the agent it represents — the link the ownership gates
    /// resolve — and the property type it deals in.
    /// <br/><br/>
    /// <c>Properties</c> is deliberately absent: it is the read-only inverse of a property's own
    /// landlord, and a write shape may not name an inverse predicate.
    /// </summary>
    private static readonly IReadOnlyList<AspectField> LandlordFields =
    [
        new("Agent", MinCount: 1, IsIri: true),
        new("LandlordType", IsIri: true),
    ];

    /// <summary>
    /// The eight rental lifecycle stages, in order. The key names the stage everywhere it
    /// appears: the view shape <c>…:shapes:rental:{key}</c>, the operation aspect
    /// <c>…:operations:rental:{key}</c>, and the page's own stage list.
    /// </summary>
    public static readonly IReadOnlyList<string> RentalStages =
    [
        "application",
        "contract",
        "deposit",
        "handover",
        "tenancy",
        "noticed",
        "handback",
        "terminated",
    ];

    /// <summary>
    /// A rental stage's fields — exactly what that stage's view declares, with that stage's
    /// presence rules.
    /// <br/><br/>
    /// A rental is written one stage at a time, so its write gate is per stage, not per entity:
    /// the aspect a save selects names that stage's fields and requires the ones its view
    /// requires. That is why <c>sh:minCount</c> belongs here — a single union shape could not
    /// carry presence at all (a union <c>sh:minCount</c> would reject every save that does not
    /// mention another stage's fields), so it had to drop the rules its views declare. One shape
    /// per stage is what lets the gate judge a save the way the form that produced it does.
    /// </summary>
    /// <param name="stage">A key of <see cref="RentalStages"/>.</param>
    public static IReadOnlyList<AspectField> RentalFieldsFor(string stage) => stage switch
    {
        "application" =>
        [
            new("Property", MinCount: 1, IsIri: true),
            new("Unit", IsIri: true),
            new("Tenant", MinCount: 1, IsIri: true),
            new("ViewingDate", MinCount: 1, MinLength: 1, Datatype: XsdString),
        ],
        "contract" =>
        [
            // The contract stage requires at least one document. RentalDocuments is an [Owning]
            // collection — an rdf:List in the graph — so the requirement is the list being
            // non-empty, which is sh:nodeKind sh:BlankNode (see AspectField.Terms).
            new("RentalDocuments", IsOwningCollection: true),
        ],
        "deposit" =>
        [
            new("DepositAmount", MinCount: 1, Datatype: XsdDecimal, MinInclusive: 0),
            new("DepositPaid", Datatype: XsdBoolean),
            new("DepositPaymentDate", MinLength: 1, Datatype: XsdString),
        ],
        "handover" =>
        [
            new("HandoverDate", MinCount: 1, MinLength: 1, Datatype: XsdString),
            new("HandoverNotes", MinLength: 1, Datatype: XsdString),
        ],
        "tenancy" =>
        [
            new("TenancyActive", Datatype: XsdBoolean),
        ],
        "noticed" =>
        [
            new("NoticeDate", MinCount: 1, MinLength: 1, Datatype: XsdString),
            new("NoticeReason", MinLength: 1, Datatype: XsdString),
        ],
        "handback" =>
        [
            new("HandbackDate", MinCount: 1, MinLength: 1, Datatype: XsdString),
            new("HandbackNotes", MinLength: 1, Datatype: XsdString),
            new("DamageConfirmed", Datatype: XsdBoolean),
        ],
        "terminated" =>
        [
            new("SettlementDate", MinCount: 1, MinLength: 1, Datatype: XsdString),
            new("DepositReturned", Datatype: XsdBoolean),
            new("SettlementNotes", MinLength: 1, Datatype: XsdString),
        ],
        _ => throw new ArgumentOutOfRangeException(
            nameof(stage),
            stage,
            $"'{stage}' is not a rental stage. Known stages: {string.Join(", ", RentalStages)}."),
    };

    /// <summary>
    /// Every field rule of an entity, by CLR property name. A rental has no single list — its
    /// rules are per stage (<see cref="RentalFieldsFor"/>), so it is not a valid argument.
    /// </summary>
    public static IReadOnlyList<AspectField> FieldsFor(Type entity) =>
        entity == typeof(Property) ? PropertyFields
        : entity == typeof(Room) ? RoomFields
        : entity == typeof(Tenant) ? TenantFields
        : entity == typeof(Landlord) ? LandlordFields
        : throw new ArgumentOutOfRangeException(
            nameof(entity),
            entity,
            $"{entity.Name} has no single field list. A rental's fields are per stage — " +
            $"use {nameof(RentalFieldsFor)}.");

    /// <summary>
    /// The type-IRI suffix a shape targeting <paramref name="entity"/> declares: the concrete type
    /// segment (ADR-0016) — the value the stored records carry as <c>rdf:type</c>, and therefore the
    /// only target that matches the entities the shape judges.
    /// <br/><br/>
    /// A tenant is no exception: it owns its own type and its own predicate space, so the concrete
    /// segment describes it exactly.
    /// </summary>
    public static string TargetSuffixOf(Type entity) =>
        EntityPathResolver.ResolveTypeSegment(entity);

    /// <summary>
    /// One <c>sh:property</c> entry for a predicate IRI, carrying the field's rule. A field whose
    /// rule declares no term — a structural field such as a room's <c>IsPartOf</c> — renders as a
    /// bare path: the shape admits the field without constraining it.
    /// </summary>
    public static string PropertyEntry(string predicateIri, AspectField rule)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(predicateIri);
        ArgumentNullException.ThrowIfNull(rule);

        var terms = new List<string> { $"sh:path <{predicateIri}>" };
        terms.AddRange(rule.Terms());

        return terms.Count == 1
            ? $"    sh:property [ {terms[0]} ]"
            : $"    sh:property [\n        {string.Join(" ;\n        ", terms)}\n    ]";
    }
}
