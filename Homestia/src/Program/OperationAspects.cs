using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.Operation;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Entities.RealEstate;

namespace Homestia.Aspects;

/// <summary>
/// Operation aspects — the write-side counterparts of Homestia's view aspects.
/// <br/><br/>
/// A view says which fields a form <em>shows</em>; an operation aspect says which
/// fields a write may <em>set</em>. The server binds a write to its aspect by the
/// <c>X-Aletheia-Operation-AspectIri</c> header and <strong>ignores every body
/// field the aspect's local shape does not mention</strong> — silently, with a
/// 200. The shapes below therefore name every field the matching views declare,
/// so what a form accepts is exactly what the graph accepts.
/// <list type="bullet">
/// <item><description><strong>Paths are the entities' own predicate IRIs</strong>,
/// resolved through <see cref="EntityQueryPredicates.ResolvePredicateIris"/> and
/// never hand-written. The write filter matches absolute predicate IRIs, so a
/// shape written in another namespace — the <c>json:</c> prefix a <em>view</em>
/// may use, say — mentions nothing that binds and every write silently drops its
/// whole body. Resolving keeps the vocabulary from drifting from the entities,
/// and a field that is not a predicate of its entity throws here rather than
/// costing a user their data.</description></item>
/// <item><description><strong>One aspect per save, not per view</strong> — a
/// rental is saved whole on every stage, and a property is saved together with
/// its rooms, so an aspect mirroring a single view would drop what the other
/// views wrote. Each aspect covers the aggregate its save writes.</description></item>
/// <item><description><strong>Structural fields are named too</strong> — the
/// writes inject fields no form shows (<c>IsPartOf</c> for a room, the derived
/// <c>CurrentStage</c> for a rental). They are part of the writable surface.</description></item>
/// <item><description><strong>Absent header = unrestricted</strong> — the
/// backend reads an absent or blank header as the NoOp aspect, so a caller that
/// selects none writes as before. Selection is the client's (Handbook decision
/// 007).</description></item>
/// </list>
/// </summary>
public static class OperationAspects
{
    /// <summary>
    /// Operation aspect governing a Property <strong>save</strong> — the whole
    /// aggregate, property and rooms alike, because the page writes them in one
    /// call. The filter resolves the shape per entity type, so each write keeps
    /// its own half.
    /// </summary>
    public const string PropertyOperationIri = "urn:aletheia:homestia:operations:property";

    /// <summary>Operation aspect governing writes to a Tenant.</summary>
    public const string TenantOperationIri = "urn:aletheia:homestia:operations:tenant";

    /// <summary>
    /// Operation aspect governing writes to a Rental. One aspect covers all eight
    /// stage views because a rental is written whole — see the class remarks.
    /// </summary>
    public const string RentalOperationIri = "urn:aletheia:homestia:operations:rental";

    /// <summary>
    /// A Property write's fields, by CLR property name: what the Property view
    /// declares. <c>SegmentedInto</c> is the room collection — the view names it
    /// <c>rooms</c>, the entity names it <c>SegmentedInto</c>. It is the
    /// <em>inverse</em> side of the relation (the room owns <c>IsPartOf</c>), so
    /// naming it makes the view's surface complete without making it settable:
    /// the link is established by each room's own write, which is why the room
    /// half names <c>IsPartOf</c>.
    /// </summary>
    public static readonly string[] PropertyWritableFields =
    [
        "Name", "Address", "PropertyType", "RentalModel", "SegmentedInto",
    ];

    /// <summary>
    /// A Room write's fields, by CLR property name: the Room view's fields plus
    /// <c>IsPartOf</c>, which no form shows but every room write must carry —
    /// without it a room is written parentless.
    /// </summary>
    public static readonly string[] RoomWritableFields =
    [
        "Name", "RoomSize", "Location", "RoomStatus", "FurnishingStatus",
        "IsPartOf",
    ];

    /// <summary>A Tenant write's fields, by CLR property name.</summary>
    public static readonly string[] TenantWritableFields =
    [
        "DisplayName", "Email", "Phone",
    ];

    /// <summary>
    /// A Rental write's fields: the union over all eight stage views, plus the
    /// derived <c>CurrentStage</c> the page persists to remember where the user
    /// stopped.
    /// </summary>
    public static readonly string[] RentalWritableFields =
    [
        // Stage 1 · Application
        "Property", "Tenant", "Unit", "ViewingDate",
        // Stage 2 · Contract
        "RentalDocuments",
        // Stage 3 · Deposit
        "DepositAmount", "DepositPaid", "DepositPaymentDate",
        // Stage 4 · Handover
        "HandoverDate", "HandoverNotes",
        // Stage 5 · Tenancy
        "TenancyActive",
        // Stage 6 · Termination noticed
        "NoticeDate", "NoticeReason",
        // Stage 7 · Handback
        "HandbackDate", "HandbackNotes", "DamageConfirmed",
        // Stage 8 · Terminated
        "SettlementDate", "DepositReturned", "SettlementNotes",
        // Written by the page, never shown by a form.
        "CurrentStage",
    ];

    /// <summary>
    /// The view fields that name a property differently: view name → CLR property
    /// name. Every other field matches case-insensitively.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string> ViewDisplayAliases =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["rooms"] = "SegmentedInto",
        };

    /// <summary>Every field any aspect admits — the vocabulary a view field belongs to.</summary>
    public static IEnumerable<string> AllWritableFields =>
        PropertyWritableFields
            .Concat(RoomWritableFields)
            .Concat(TenantWritableFields)
            .Concat(RentalWritableFields);

    /// <summary>
    /// The CLR property name a view's field name refers to, or <c>null</c> when the
    /// name matches nothing in the writable vocabulary.
    /// </summary>
    public static string? PropertyNameFor(string viewField)
    {
        ArgumentNullException.ThrowIfNull(viewField);

        if (ViewDisplayAliases.TryGetValue(viewField, out var alias)) return alias;

        foreach (var name in AllWritableFields)
        {
            if (string.Equals(name, viewField, StringComparison.OrdinalIgnoreCase)) return name;
        }
        return null;
    }

    /// <summary>
    /// Builds the local shape of an operation aspect: the predicate IRIs a write
    /// may set, one <c>sh:property</c> each. No datatypes, required counts or
    /// messages — on the write path a shape decides <em>which</em> fields bind,
    /// while the view decides what a valid value is (the form validates against it
    /// before it sends).
    /// </summary>
    /// <param name="iri">The aspect's IRI, used as the shape's subject.</param>
    /// <param name="parts">Per entity type, the fields that entity's writes may set.</param>
    /// <exception cref="InvalidOperationException">
    /// A field names no predicate of its entity — thrown at registration, so a
    /// typo can never reach a user's save.
    /// </exception>
    public static string ShapeFor(
        string iri,
        params (Type Entity, IReadOnlyList<string> Fields)[] parts)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(iri);
        ArgumentNullException.ThrowIfNull(parts);
        if (parts.Length == 0)
            throw new ArgumentException("An operation shape must admit at least one entity.", nameof(parts));

        var paths = new List<string>();
        foreach (var (entity, fields) in parts)
        {
            var predicates = EntityQueryPredicates.ResolvePredicateIris(entity);
            foreach (var field in fields)
            {
                if (!predicates.TryGetValue(field, out var predicateIri))
                {
                    throw new InvalidOperationException(
                        $"'{field}' is not a predicate of {entity.Name}: an operation aspect naming it " +
                        "would mention nothing that binds, and the write would silently drop the field.");
                }
                paths.Add(predicateIri);
            }
        }

        // `sh:property [...] ; sh:property [...] .` — the separators are joined,
        // not appended, so the statement terminates with a period.
        var body = string.Join(
            " ;\n",
            paths.Select(path => $"    sh:property [ sh:path <{path}> ]"));

        return $"""
            @prefix sh: <http://www.w3.org/ns/shacl#> .

            <{iri}>
                a sh:NodeShape ;
            {body} .
            """;
    }

    /// <summary>
    /// Registers the operation aspects with the SDK's aspect store. Runs
    /// alongside the view and query registrations, before the store seals — and
    /// therefore before any write can arrive.
    /// </summary>
    public static void RegisterOperationAspects(IAspectStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        store.RegisterOperation(new InlineTtlOperationAspect(
            PropertyOperationIri,
            ShapeFor(
                PropertyOperationIri,
                (typeof(Property), PropertyWritableFields),
                (typeof(Room), RoomWritableFields)),
            contextWhere: null));

        store.RegisterOperation(new InlineTtlOperationAspect(
            TenantOperationIri,
            ShapeFor(TenantOperationIri, (typeof(Tenant), TenantWritableFields)),
            contextWhere: null));

        store.RegisterOperation(new InlineTtlOperationAspect(
            RentalOperationIri,
            ShapeFor(RentalOperationIri, (typeof(Rental), RentalWritableFields)),
            contextWhere: null));
    }
}
