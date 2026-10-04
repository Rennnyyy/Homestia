using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.Operation;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Repository;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Entities.RealEstate;

namespace Homestia.Aspects;

/// <summary>
/// Operation aspects — the write-side counterparts of Homestia's view aspects.
/// <br/><br/>
/// A view says which fields a form <em>shows</em> and how it judges them; an
/// operation aspect says which fields a write may <em>set</em> and judges them the
/// same way. The server binds a write to its aspect by the
/// <c>X-Aletheia-Operation-AspectIri</c> header, <strong>ignores every body field
/// the aspect's local shape does not mention</strong> — silently, with a 200 — and
/// validates the admitted values against the shape's constraints. The shapes below
/// therefore name every field the matching views declare, <em>with the rule each
/// view declares</em>, so what a form accepts is exactly what the graph accepts — the
/// form from the frontend, the shape from the server.
/// <list type="bullet">
/// <item><description><strong>Paths are the entities' own predicate IRIs</strong>,
/// resolved through <see cref="EntityQueryPredicates.ResolvePredicateIris"/> and
/// never hand-written. The write filter matches absolute predicate IRIs, so a
/// shape written in another namespace — the <c>json:</c> prefix a <em>view</em>
/// may use, say — mentions nothing that binds and every write silently drops its
/// whole body. Resolving keeps the vocabulary from drifting from the entities,
/// and a field that is not a predicate of its entity throws here rather than
/// costing a user their data.</description></item>
/// <item><description><strong>Every shape targets its entity</strong> — each
/// part emits its own <c>sh:NodeShape</c> declaring <c>sh:targetClass</c>:
/// the concrete type segment (ADR-0016), or the entity path where an
/// inherited predicate resolves against an ancestor's path (a tenant's
/// <c>displayName</c> lives under the agent's predicate path). The SDK
/// rejects a targetless shape and a shape that names predicates outside its
/// target.</description></item>
/// <item><description><strong>One aspect per entity</strong> — an aspect names ONE
/// entity's writable surface, and its shape's <c>sh:targetClass</c> says which. A
/// property and its rooms are different entity types, so each has its own aspect and
/// the aggregate save selects both (<c>parentAspectIri</c> / <c>childAspectIri</c>).
/// A rental moves through its lifecycle one stage at a time, so <strong>each stage
/// has its own aspect</strong> carrying that stage's fields <em>with the presence
/// rules its view declares</em>. A single aspect could only carry the union of the
/// stages, and a union presence rule would reject every save that does not mention
/// another stage's fields — so the union had to drop presence entirely, and the gate
/// admitted a stage's save with the stage's own required fields left empty.</description></item>
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
    /// Operation aspect governing a Property <strong>write</strong> — the property
    /// alone. Its rooms are a different entity type with their own writable surface,
    /// so the aggregate save selects <see cref="RoomOperationIri"/> for them
    /// (<c>childAspectIri</c>).
    /// </summary>
    public const string PropertyOperationIri = "urn:aletheia:homestia:operations:property";

    /// <summary>
    /// Operation aspect governing a Room <strong>write</strong> — the entries a property
    /// save carries, and any standalone room edit.
    /// </summary>
    public const string RoomOperationIri = "urn:aletheia:homestia:operations:room";

    /// <summary>Operation aspect governing writes to a Tenant.</summary>
    public const string TenantOperationIri = "urn:aletheia:homestia:operations:tenant";

    /// <summary>
    /// Operation aspect governing writes to a Landlord — the record the ownership link starts at.
    /// </summary>
    public const string LandlordOperationIri = "urn:aletheia:homestia:operations:landlord";

    /// <summary>
    /// The rental lifecycle stages, in order. The stage key is the last segment of the stage's
    /// aspect IRI and of its view shape IRI, and the name the page uses for the stage.
    /// </summary>
    public static IReadOnlyList<string> RentalStages => AspectFields.RentalStages;

    /// <summary>Operation aspect governing a Rental write at Stage 1 · Application.</summary>
    public const string RentalApplicationOperationIri = "urn:aletheia:homestia:operations:rental:application";

    /// <summary>Operation aspect governing a Rental write at Stage 2 · Contract.</summary>
    public const string RentalContractOperationIri = "urn:aletheia:homestia:operations:rental:contract";

    /// <summary>Operation aspect governing a Rental write at Stage 3 · Deposit.</summary>
    public const string RentalDepositOperationIri = "urn:aletheia:homestia:operations:rental:deposit";

    /// <summary>Operation aspect governing a Rental write at Stage 4 · Handover.</summary>
    public const string RentalHandoverOperationIri = "urn:aletheia:homestia:operations:rental:handover";

    /// <summary>Operation aspect governing a Rental write at Stage 5 · Tenancy.</summary>
    public const string RentalTenancyOperationIri = "urn:aletheia:homestia:operations:rental:tenancy";

    /// <summary>Operation aspect governing a Rental write at Stage 6 · Termination Noticed.</summary>
    public const string RentalNoticedOperationIri = "urn:aletheia:homestia:operations:rental:noticed";

    /// <summary>Operation aspect governing a Rental write at Stage 7 · Handback.</summary>
    public const string RentalHandbackOperationIri = "urn:aletheia:homestia:operations:rental:handback";

    /// <summary>Operation aspect governing a Rental write at Stage 8 · Terminated.</summary>
    public const string RentalTerminatedOperationIri = "urn:aletheia:homestia:operations:rental:terminated";

    /// <summary>
    /// The aspect IRI governing each lifecycle stage's write, by stage key. A stage key is the
    /// last segment of the stage's aspect IRI and of its view shape IRI, so the key, the aspect
    /// and the view are three names for one stage and cannot drift apart unnoticed.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, string> RentalOperationIrisByStage =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["application"] = RentalApplicationOperationIri,
            ["contract"] = RentalContractOperationIri,
            ["deposit"] = RentalDepositOperationIri,
            ["handover"] = RentalHandoverOperationIri,
            ["tenancy"] = RentalTenancyOperationIri,
            ["noticed"] = RentalNoticedOperationIri,
            ["handback"] = RentalHandbackOperationIri,
            ["terminated"] = RentalTerminatedOperationIri,
        };

    /// <summary>
    /// The operation aspect IRI governing <paramref name="stage"/>'s write — the gate a save
    /// selects when it persists that stage.
    /// </summary>
    /// <param name="stage">A key of <see cref="AspectFields.RentalStages"/>.</param>
    public static string RentalOperationIriFor(string stage) =>
        RentalOperationIrisByStage.TryGetValue(stage, out var iri)
            ? iri
            : throw new ArgumentOutOfRangeException(
                nameof(stage),
                stage,
                $"'{stage}' is not a rental stage. Known stages: {string.Join(", ", AspectFields.RentalStages)}.");

    /// <summary>Every rental stage aspect IRI, in lifecycle order.</summary>
    public static IReadOnlyList<string> RentalOperationIris { get; } =
        [.. AspectFields.RentalStages.Select(RentalOperationIriFor)];

    /// <summary>
    /// A Property write's fields, by CLR property name: what the Property view
    /// declares, minus the room collection. <c>SegmentedInto</c> is the
    /// <em>inverse</em> side of the relation — the view shows it as
    /// <c>rooms</c>, but no write ever sets it: the link is established by each
    /// room's own <c>IsPartOf</c> (the owning side, named by the room half), and
    /// the SDK rejects a write shape that names an inverse predicate.
    /// <br/><br/>
    /// Each list is derived from <see cref="AspectFields"/> — the one place a field's
    /// rule is described — so the operation shape, the query result shape and the view
    /// cannot disagree about which fields exist.
    /// </summary>
    public static IReadOnlyList<AspectField> PropertyWritableFields { get; } =
        AspectFields.FieldsFor(typeof(Property));

    /// <summary>
    /// A Room write's fields, by CLR property name: the Room view's fields plus
    /// <c>IsPartOf</c>, which no form shows but every room write must carry —
    /// without it a room is written parentless.
    /// </summary>
    public static IReadOnlyList<AspectField> RoomWritableFields { get; } =
        [.. AspectFields.FieldsFor(typeof(Room)), new AspectField("IsPartOf")];

    /// <summary>A Tenant write's fields, by CLR property name.</summary>
    public static IReadOnlyList<AspectField> TenantWritableFields { get; } =
        AspectFields.FieldsFor(typeof(Tenant));

    /// <summary>
    /// A Landlord write's fields, by CLR property name — the agent it represents and the property
    /// type it deals in. <c>Properties</c> is deliberately absent: it is the read-only inverse of a
    /// property's own landlord, and a write naming an inverse predicate is refused at registration.
    /// </summary>
    public static IReadOnlyList<AspectField> LandlordWritableFields { get; } =
        AspectFields.FieldsFor(typeof(Landlord));

    /// <summary>
    /// A Rental write's fields for <paramref name="stage">: that stage's view fields, plus the</paramref>
    /// derived <c>CurrentStage</c> the page persists to remember where the user stopped.
    /// </summary>
    /// <param name="stage">A key of <see cref="AspectFields.RentalStages"/>.</param>
    public static IReadOnlyList<AspectField> RentalWritableFieldsFor(string stage) =>
        [.. AspectFields.RentalFieldsFor(stage), new AspectField("CurrentStage")];

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
            .Concat(LandlordWritableFields)
            .Concat(AspectFields.RentalStages.SelectMany(RentalWritableFieldsFor))
            .Select(static writableField => writableField.Name);

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
    /// Builds the local shape of an operation aspect: one <c>sh:NodeShape</c> per
    /// entity type, each targeting that entity's type IRI and naming the predicate
    /// IRIs its writes may set <strong>with the validation rule the view declares</strong>.
    /// The shape decides which fields bind and judges each value the same way the form
    /// does — the form is the first gate, the server the one a caller cannot bypass.
    /// <br/><br/>
    /// Every node shape declares <c>sh:targetClass</c>: the SDK rejects a
    /// targetless operation shape at registration, and its membership check rejects
    /// a shape that lists predicates outside its target entity. The target suffix
    /// is passed per part — the concrete type segment (ADR-0016) where the entity's
    /// own vocabulary suffices, the entity path where an inherited predicate
    /// resolves against an ancestor's predicate path.
    /// <br/><br/>
    /// A part carries the fields <strong>with their rules</strong>, so presence is
    /// declared where the field is: a rental stage's shape requires exactly what that
    /// stage's view requires, and no shape has to suppress a rule it would rather not
    /// carry.
    /// </summary>
    /// <param name="iri">The aspect's IRI; each part's shape is a child node of it.</param>
    /// <param name="parts">Per entity type: the fields that entity's writes may set, with
    /// their rules, and the type-IRI suffix its shape targets (a type segment or an
    /// entity path).</param>
    /// <exception cref="InvalidOperationException">
    /// A field names no predicate of its entity — thrown at registration, so a
    /// typo can never reach a user's save.
    /// </exception>
    public static string ShapeFor(
        string iri,
        params (Type Entity, IReadOnlyList<AspectField> Fields, string TargetSuffix)[] parts)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(iri);
        ArgumentNullException.ThrowIfNull(parts);
        if (parts.Length == 0)
            throw new ArgumentException("An operation shape must admit at least one entity.", nameof(parts));

        var blocks = new List<string>(parts.Length);
        foreach (var (entity, fields, targetSuffix) in parts)
        {
            var predicates = EntityQueryPredicates.ResolvePredicateIris(entity);

            var entries = new List<string>(fields.Count);
            foreach (var field in fields)
            {
                if (!predicates.TryGetValue(field.Name, out var predicateIri))
                {
                    throw new InvalidOperationException(
                        $"'{field.Name}' is not a predicate of {entity.Name}: an operation aspect naming it " +
                        "would mention nothing that binds, and the write would silently drop the field.");
                }

                entries.Add(AspectFields.PropertyEntry(predicateIri, field));
            }

            var shapeIri = parts.Length == 1 ? iri : $"{iri}/{entity.Name}";
            var targetIri = new EntityRepositoryOptions()
                .ResolveTypeIri(entity.Name, targetSuffix);

            // `sh:property [...] ; sh:property [...] .` — the separators are joined,
            // not appended, so the statement terminates with a period.
            blocks.Add($"""
            <{shapeIri}>
                a sh:NodeShape ;
                sh:targetClass <{targetIri}> ;
            {string.Join(" ;\n", entries)} .
            """);
        }

        return $"""
            @prefix sh: <http://www.w3.org/ns/shacl#> .
            @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

            {string.Join("\n", blocks)}
            """;
    }

    /// <summary>
    /// Registers the operation aspects with the SDK's aspect store. Runs
    /// alongside the view and query registrations, before the store seals — and
    /// therefore before any write can arrive.
    /// <br/><br/>
    /// Twelve aspects: one per entity the host writes (property, room, tenant, landlord) and one
    /// per rental lifecycle stage. Each is registered under its own IRI, so a caller
    /// selects the gate it means rather than a gate that has to admit everything either
    /// of them might send.
    /// <br/><br/>
    /// The property, room and landlord aspects also carry a <c>ContextWhere</c>: the ownership
    /// rule evaluated against the store, which is what makes "only the connected landlord may
    /// store this" enforceable rather than a convention the page happens to follow.
    /// </summary>
    public static void RegisterOperationAspects(IAspectStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        store.RegisterOperation(new InlineTtlOperationAspect(
            PropertyOperationIri,
            ShapeFor(PropertyOperationIri, (typeof(Property), PropertyWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Property)))),
            contextWhere: OwnershipRules.DenyViolation(
                OwnershipRules.PropertyOwnedByAgent,
                "Only this property's landlord may change it.")));

        store.RegisterOperation(new InlineTtlOperationAspect(
            RoomOperationIri,
            ShapeFor(RoomOperationIri, (typeof(Room), RoomWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Room)))),
            contextWhere: OwnershipRules.DenyViolation(
                OwnershipRules.RoomOwnedByAgent,
                "Only the landlord of the property this room is part of may change it.")));

        // A tenant is an ordinary entity: its shape targets the concrete type segment, like every
        // other shape here.
        store.RegisterOperation(new InlineTtlOperationAspect(
            TenantOperationIri,
            ShapeFor(TenantOperationIri, (typeof(Tenant), TenantWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Tenant)))),
            contextWhere: null));

        // A landlord is where ownership starts, so its write is gated too: a caller may only change
        // the landlord record that names it. Creating one is what provisioning an agent does, and a
        // create has no stored state to judge — see OwnershipRules.
        store.RegisterOperation(new InlineTtlOperationAspect(
            LandlordOperationIri,
            ShapeFor(LandlordOperationIri, (typeof(Landlord), LandlordWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Landlord)))),
            contextWhere: OwnershipRules.DenyViolation(
                OwnershipRules.LandlordOwnedByAgent,
                "Only the agent this landlord represents may change it.")));

        // One aspect per lifecycle stage: the gate a stage's save selects carries that
        // stage's fields and that stage's presence rules, so a stage cannot be persisted
        // with its own required fields empty.
        var rentalSuffix = EntityPathResolver.ResolveTypeSegment(typeof(Rental));
        foreach (var stage in AspectFields.RentalStages)
        {
            var iri = RentalOperationIriFor(stage);
            store.RegisterOperation(new InlineTtlOperationAspect(
                iri,
                ShapeFor(iri, (typeof(Rental), RentalWritableFieldsFor(stage), rentalSuffix)),
                contextWhere: null));
        }
    }
}
