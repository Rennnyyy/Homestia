using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.Query;
using Aletheia.Sdk.Repository;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Entities.RealEstate;

namespace Homestia.Aspects;

/// <summary>
/// Query aspects — the read side of Homestia's aspects, and the surface a read's role is assigned
/// to. A query aspect is an <strong>access gate</strong>: the platform authorizes a read against
/// it, so it admits only an agent holding one of its roles, and its optional <c>FilterWhere</c>
/// narrows the rows. Where a read needs knowledge the graph does not store, the aspect also
/// <em>derives</em> it — the rental state aspect is the one that does. The browser opts in per
/// request via the <c>X-Aletheia-Query-AspectIri</c> header.
/// <br/><br/>
/// A query aspect <strong>declares the response it returns</strong>: its result shape names the
/// entity's complete predicate vocabulary and carries no constraint. Both halves are load-bearing
/// under the platform's projection rule — a declared result shape <em>is</em> the projection, so
/// <list type="bullet">
/// <item>naming <strong>every</strong> predicate is how the aspect says "the whole record": a
/// field it left out would be cleared from the response, silently;</item>
/// <item>a shape that declared <strong>no</strong> property would project every stored property
/// away, so "narrow" cannot mean "declare nothing" either.</item>
/// </list>
/// The field list comes from <see cref="EntityQueryPredicates"/> rather than a hand-kept copy, so
/// an entity field is in the response the day it exists. Rules stay on the write side — the
/// operation aspect, rendered from <see cref="AspectFields"/> — because a read is not judged the
/// way a form submission is: a stored record that predates a rule would become unreadable. The one
/// property the shape labels is the field the aspect <em>derives</em>, since that is the one the
/// shape introduces rather than inherits from the entity.
/// </summary>
public static class QueryAspects
{
    /// <summary>IRI of the Rental state aspect.</summary>
    public const string RentalStateQueryAspectIri = "urn:aletheia:homestia:query:rental-state";

    /// <summary>IRI of the Property access aspect — the surface a property read runs under.</summary>
    public const string PropertyQueryAspectIri = "urn:aletheia:homestia:query:property";

    /// <summary>IRI of the Room access aspect.</summary>
    public const string RoomQueryAspectIri = "urn:aletheia:homestia:query:room";

    /// <summary>IRI of the Tenant read aspect.</summary>
    public const string TenantQueryAspectIri = "urn:aletheia:homestia:query:tenant";

    /// <summary>
    /// IRI of the Landlord read aspect — a caller sees the landlord record that names it, which is
    /// how a page finds the landlord to bind a new property to.
    /// </summary>
    public const string LandlordQueryAspectIri = "urn:aletheia:homestia:query:landlord";

    /// <summary>
    /// The predicate the <see cref="RentalStateConstruct"/> derives — a field no write stores and
    /// no entity property maps, so the result shape has to name it explicitly.
    /// </summary>
    public const string RentalStatePredicate = "https://homestia.katharsis.digital/predicates/rental/state";

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
    public const string RentalStateConstruct = $$"""
        CONSTRUCT {
            ?entityIri <{{RentalStatePredicate}}> ?state
        }
        WHERE {
            ?entityIri <https://homestia.katharsis.digital/predicates/rental/currentStage> ?stage .
            BIND(REPLACE(STR(?stage), "^.*/", "") AS ?stageKey)
            OPTIONAL { ?entityIri <https://homestia.katharsis.digital/predicates/rental/tenant> ?tenant }
            BIND(
                IF(?stageKey = "terminated", "closed",
                   IF(?stageKey = "handback" || ?stageKey = "noticed", "ending",
                      IF(?stageKey = "tenancy", "active",
                         IF(?stageKey = "application" && !BOUND(?tenant), "new",
                            "progressing")))) AS ?state)
        }
        """;

    /// <summary>
    /// The result shape of a query aspect: the entity's complete predicate vocabulary, declared
    /// without a single constraint.
    /// <br/><br/>
    /// A declared result shape <em>is</em> the projection — the store clears every predicate the
    /// shape does not mention — so this shape is how the aspect says "the whole record". Naming
    /// every predicate the entity maps is drift-proof by construction: the list comes from
    /// <see cref="EntityQueryPredicates.ResolvePredicateIris"/>, never from a hand-kept copy that a
    /// new entity field would silently fall out of. (Declaring no shape at all is the OTHER
    /// statement — no projection, and nothing describing the response.)
    /// <br/><br/>
    /// It carries no rules, on purpose. Presence and datatype belong to the operation aspect a form
    /// submits through; judging a read by them would make a stored record that predates a rule
    /// unreadable.
    /// </summary>
    /// <param name="iri">The aspect IRI; the shape is a child node of it.</param>
    /// <param name="entity">The entity the read returns.</param>
    /// <param name="derived">
    /// A predicate the aspect's enrichment construct derives, named too — a projection clears what
    /// it does not mention, including the derived field the aspect exists for. It is the one
    /// property a query shape must label (<c>sh:name</c>), because it is the one property the shape
    /// introduces rather than inherits from the entity.
    /// </param>
    public static string ResultShapeFor(
        string iri,
        Type entity,
        (string Iri, string EnglishName, string GermanName)? derived = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(iri);
        ArgumentNullException.ThrowIfNull(entity);

        var targetIri = new EntityRepositoryOptions()
            .ResolveTypeIri(entity.Name, AspectFields.TargetSuffixOf(entity));

        var entries = EntityQueryPredicates.ResolvePredicateIris(entity)
            .Values
            .Distinct(StringComparer.Ordinal)
            .OrderBy(static predicate => predicate, StringComparer.Ordinal)
            .Select(static predicate => $"    sh:property [ sh:path <{predicate}> ]")
            .ToList();

        if (derived is { } reasoned)
        {
            entries.Add($"""
                    sh:property [
                        sh:path <{reasoned.Iri}> ;
                        sh:name "{reasoned.EnglishName}"@en, "{reasoned.GermanName}"@de
                    ]
                """);
        }

        return $"""
            @prefix sh: <http://www.w3.org/ns/shacl#> .

            <{iri}>
                a sh:NodeShape ;
                sh:targetClass <{targetIri}> ;
            {string.Join(" ;\n", entries)} .
            """;
    }

    /// <summary>
    /// Registers every query aspect into the SDK's aspect store. Runs alongside
    /// the view registrations before the store seals.
    /// <br/><br/>
    /// Five surfaces, one per read a role needs to be assignable to: the property, room, tenant and
    /// landlord lists, and the rentals list — which also derives the lifecycle <c>state</c> the
    /// graph does not store, so its shape names that derived field as well.
    /// <br/><br/>
    /// The property, room, landlord and rental surfaces also carry a <c>FilterWhere</c>: the ownership rule,
    /// stated as the ALLOW clause the access gate expects. Those filters apply to the point read and
    /// to the list scan alike, so a caller cannot reach another landlord's record by asking for it
    /// by IRI any more than by listing. The landlord surface is the STRICT form of the same clause
    /// (<c>RequireOwnFilter</c>): its answer is the caller's own identity, so a caller without one is
    /// answered with nothing rather than with somebody else's record. A rental is owned through the
    /// property it is for, so an agent reads exactly the rentals of its own properties.
    /// </summary>
    public static void RegisterQueryAspects(IAspectStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        store.RegisterQuery(new InlineTtlQueryAspect(
            RentalStateQueryAspectIri,
            filterWhere: OwnershipRules.AllowFilter(OwnershipRules.RentalOwnedByAgent),
            resultShapeTtl: ResultShapeFor(
                RentalStateQueryAspectIri,
                typeof(Rental),
                derived: (RentalStatePredicate, "State", "Status")),
            enrichmentConstruct: RentalStateConstruct));

        // The access surface of every other list read — the entity's whole vocabulary, unconstrained.
        store.RegisterQuery(new InlineTtlQueryAspect(
            PropertyQueryAspectIri,
            filterWhere: OwnershipRules.AllowFilter(OwnershipRules.PropertyOwnedByAgent),
            resultShapeTtl: ResultShapeFor(PropertyQueryAspectIri, typeof(Property)),
            enrichmentConstruct: null));

        store.RegisterQuery(new InlineTtlQueryAspect(
            RoomQueryAspectIri,
            filterWhere: OwnershipRules.AllowFilter(OwnershipRules.RoomOwnedByAgent),
            resultShapeTtl: ResultShapeFor(RoomQueryAspectIri, typeof(Room)),
            enrichmentConstruct: null));

        store.RegisterQuery(new InlineTtlQueryAspect(
            TenantQueryAspectIri,
            filterWhere: null,
            resultShapeTtl: ResultShapeFor(TenantQueryAspectIri, typeof(Tenant)),
            enrichmentConstruct: null));

        store.RegisterQuery(new InlineTtlQueryAspect(
            LandlordQueryAspectIri,
            filterWhere: OwnershipRules.RequireOwnFilter(OwnershipRules.LandlordOwnedByAgent),
            resultShapeTtl: ResultShapeFor(LandlordQueryAspectIri, typeof(Landlord)),
            enrichmentConstruct: null));
    }
}
