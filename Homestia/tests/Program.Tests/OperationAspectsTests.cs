using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Repository.Contracts;
using Homestia.Aspects;
using Homestia.Entities.RealEstate;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using System.Text.RegularExpressions;

namespace Homestia.Tests;

/// <summary>
/// Unit tests for <see cref="OperationAspects"/> — the write-side counterparts of
/// Homestia's views.
/// <br/><br/>
/// The load-bearing test is <see cref="Every_view_field_is_writable"/>: the server
/// ignores any body field an operation aspect does not name, silently and with a
/// 200. A view that gains a field its operation shape does not admit would break
/// saving with no error anywhere — these tests are that failure, moved to build
/// time. They compare <strong>predicate IRIs</strong>, not field names, because
/// that is what the write filter matches: a shape in the wrong namespace (the
/// <c>json:</c> prefix a view uses, for instance) mentions nothing that binds and
/// drops every field of the write.
/// </summary>
public sealed class OperationAspectsTests
{
    private static IAspectStore CreateStore()
    {
        var services = new ServiceCollection();
        services.AddAspects();
        return services.BuildServiceProvider().GetRequiredService<IAspectStore>();
    }

    /// <summary>
    /// Every shape a form can save from, the entity the write reaches, and — for a rental — the
    /// lifecycle stage the view belongs to (empty for the single-entity views).
    /// <br/><br/>
    /// A view missing from this table would be unguarded on write —
    /// <see cref="Every_view_shape_is_covered"/> closes that. A rental stage is one row, because
    /// each stage is its own write gate: the stage key selects both the aspect and the field set.
    /// </summary>
    public static TheoryData<string, Type, string> ViewToOperation() => new()
    {
        { ViewAspects.PropertyTtl, typeof(Property), "" },
        { ViewAspects.RoomTtl, typeof(Room), "" },
        { ViewAspects.TenantTtl, typeof(Tenant), "" },
        { ViewAspects.LandlordTtl, typeof(Landlord), "" },
        { ViewAspects.RentalApplicationTtl, typeof(Rental), "application" },
        { ViewAspects.RentalContractTtl, typeof(Rental), "contract" },
        { ViewAspects.RentalDepositTtl, typeof(Rental), "deposit" },
        { ViewAspects.RentalHandoverTtl, typeof(Rental), "handover" },
        { ViewAspects.RentalTenancyTtl, typeof(Rental), "tenancy" },
        { ViewAspects.RentalNoticedTtl, typeof(Rental), "noticed" },
        { ViewAspects.RentalHandbackTtl, typeof(Rental), "handback" },
        { ViewAspects.RentalTerminatedTtl, typeof(Rental), "terminated" },
    };

    /// <summary>The JSON field names a view shape declares.</summary>
    private static string[] ViewFieldsOf(string ttl) =>
        Regex.Matches(ttl, @"sh:path\s+json:([A-Za-z0-9_]+)")
            .Select(match => match.Groups[1].Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    /// <summary>The predicate IRIs a shape names.</summary>
    private static string[] PathsOf(string shape) =>
        Regex.Matches(shape, @"sh:path\s+<([^>]+)>")
            .Select(match => match.Groups[1].Value)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

    /// <summary>
    /// The fields the aspect governing <paramref name="entity"/> admits. A rental's are per
    /// stage — <paramref name="stage"/> names which (ignored by the single-entity aspects).
    /// </summary>
    private static IReadOnlyList<AspectField> WritableFieldsFor(Type entity, string stage) => entity switch
    {
        var t when t == typeof(Property) => OperationAspects.PropertyWritableFields,
        var t when t == typeof(Room) => OperationAspects.RoomWritableFields,
        var t when t == typeof(Tenant) => OperationAspects.TenantWritableFields,
        var t when t == typeof(Landlord) => OperationAspects.LandlordWritableFields,
        _ => OperationAspects.RentalWritableFieldsFor(stage),
    };

    /// <summary>
    /// The shape the write runs under — one entity each; a property save selects two. A rental
    /// selects the shape of the stage it is saving.
    /// </summary>
    private static string ShapeAdmitting(Type entity, string stage = "") => entity switch
    {
        var t when t == typeof(Property) => OperationAspects.ShapeFor(
            OperationAspects.PropertyOperationIri,
            (typeof(Property), OperationAspects.PropertyWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Property)))),
        var t when t == typeof(Room) => OperationAspects.ShapeFor(
            OperationAspects.RoomOperationIri,
            (typeof(Room), OperationAspects.RoomWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Room)))),
        var t when t == typeof(Tenant) => OperationAspects.ShapeFor(
            OperationAspects.TenantOperationIri,
            (typeof(Tenant), OperationAspects.TenantWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Tenant)))),
        var t when t == typeof(Landlord) => OperationAspects.ShapeFor(
            OperationAspects.LandlordOperationIri,
            (typeof(Landlord), OperationAspects.LandlordWritableFields, EntityPathResolver.ResolveTypeSegment(typeof(Landlord)))),
        _ => OperationAspects.ShapeFor(
            OperationAspects.RentalOperationIriFor(stage),
            (typeof(Rental), OperationAspects.RentalWritableFieldsFor(stage), EntityPathResolver.ResolveTypeSegment(typeof(Rental)))),
    };

    [Theory]
    [MemberData(nameof(ViewToOperation))]
    public void Every_view_field_is_writable(string viewTtl, Type entity, string stage)
    {
        var predicates = EntityQueryPredicates.ResolvePredicateIris(entity);
        var shape = ShapeAdmitting(entity, stage);
        var writable = WritableFieldsFor(entity, stage).Select(field => field.Name).ToArray();

        foreach (var field in ViewFieldsOf(viewTtl))
        {
            var name = OperationAspects.PropertyNameFor(field);
            name.ShouldNotBeNull($"the view field '{field}' belongs to no writable property");

            // An inverse is shown, never set: the property view displays the rooms it holds,
            // but a write establishes the link through the room's own IsPartOf — the owning
            // side, named by the ROOM aspect (the property aspect governs property fields only).
            if (name == nameof(Property.SegmentedInto))
            {
                var owningSide = EntityQueryPredicates.ResolvePredicateIris(typeof(Room));
                ShapeAdmitting(typeof(Room)).ShouldContain($"<{owningSide["IsPartOf"]}>",
                    customMessage: "the room aspect must name IsPartOf, the owning side of the inverse");
                continue;
            }

            writable.ShouldContain(name);

            predicates.ContainsKey(name).ShouldBeTrue(
                $"{entity.Name}.{name} is not a predicate, so no write could ever set it");
            shape.ShouldContain(
                $"<{predicates[name]}>",
                customMessage: $"the operation shape does not name {entity.Name}.{name} — a write " +
                    "selecting the aspect would silently drop it");
        }
    }

    [Fact]
    public void Every_view_shape_is_covered()
    {
        var covered = ViewToOperation()
            .Select(row => (string)row[0]!)
            .ToHashSet(StringComparer.Ordinal);

        ViewAspectsTests.ServedShapes()
            .Select(row => (string)row[1]!)
            .Where(ttl => !covered.Contains(ttl))
            .ShouldBeEmpty("every view a form can save from needs an operation aspect that admits its fields");
    }

    [Fact]
    public void Shape_paths_are_the_entities_own_vocabulary()
    {
        // The bug this guards: a shape written with the `json:` namespace a view
        // uses mentions nothing the write filter can bind to, so a save returns
        // 200 and changes nothing.
        var shape = ShapeAdmitting(typeof(Room));
        var predicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Room));

        shape.ShouldNotContain("json:", Case.Insensitive);
        shape.ShouldContain($"<{predicates["RoomSize"]}>");
        // The room aspect names exactly the room's writable surface — its own path for the fields
        // it declares, the declaring type's path for the one it inherits (Name, on Segmentation).
        var every = OperationAspects.RoomWritableFields
            .Select(field => predicates[field.Name])
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        PathsOf(shape).ShouldBe(every, ignoreOrder: true);
    }

    [Fact]
    public void A_field_that_is_no_predicate_fails_at_registration()
    {
        // Naming a field an entity does not have must throw here — the moment the
        // aspect is built — rather than silently narrowing what a user can save.
        Should.Throw<InvalidOperationException>(() =>
            OperationAspects.ShapeFor(
                "urn:test:bad",
                (typeof(Room), [new AspectField("NoSuchProperty")], EntityPathResolver.ResolveTypeSegment(typeof(Room)))));
    }

    [Fact]
    public void Structural_fields_no_view_shows_are_still_writable()
    {
        // The forms never render these, but the writes always send them: a room
        // without IsPartOf is parentless, a rental without CurrentStage loses the
        // stage the user stopped at.
        OperationAspects.RoomWritableFields.Select(field => field.Name).ShouldContain("IsPartOf");
        // CurrentStage is on EVERY stage's aspect, because the page persists it on every save.
        foreach (var stage in OperationAspects.RentalStages)
            OperationAspects.RentalWritableFieldsFor(stage).Select(field => field.Name).ShouldContain("CurrentStage");
    }

    [Fact]
    public void The_property_and_room_aspects_are_split()
    {
        // A property save writes two entity types, and an aspect names ONE entity's writable
        // surface — so the page selects both (parentAspectIri / childAspectIri). Each shape names
        // exactly its own fields. Name is declared on Segmentation, so both legitimately carry the
        // SAME predicate IRI for it; a room-ONLY path must never appear on the property shape.
        var property = ShapeAdmitting(typeof(Property));
        var room = ShapeAdmitting(typeof(Room));
        var propertyPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Property));
        var roomPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Room));

        PathsOf(property).ShouldBe(
            OperationAspects.PropertyWritableFields.Select(field => propertyPredicates[field.Name]).Distinct(StringComparer.Ordinal),
            ignoreOrder: true);
        PathsOf(room).ShouldBe(
            OperationAspects.RoomWritableFields.Select(field => roomPredicates[field.Name]).Distinct(StringComparer.Ordinal),
            ignoreOrder: true);

        // Each shape targets its own entity.
        property.ShouldContain("types/segmentations/Property");
        room.ShouldContain("types/segmentations/Room");
    }

    [Fact]
    public void Every_rental_stage_is_its_own_write_gate()
    {
        // A rental is saved one stage at a time, so each stage has its own aspect: the fields that
        // stage's form sends (plus the derived CurrentStage) and that stage's own presence rules.
        // The point of the split is that a stage's gate can require the stage's own fields — a
        // union aspect could not carry presence at all.
        var rentalPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Rental));
        var stageFields = new Dictionary<string, string[]>(StringComparer.Ordinal);

        foreach (var stage in OperationAspects.RentalStages)
        {
            var writable = OperationAspects.RentalWritableFieldsFor(stage);
            var shape = ShapeAdmitting(typeof(Rental), stage);

            // The shape names exactly this stage's fields — none of another stage's, none missing.
            PathsOf(shape).ShouldBe(
                writable.Select(field => rentalPredicates[field.Name]).Distinct(StringComparer.Ordinal),
                ignoreOrder: true,
                customMessage: $"the {stage} aspect does not name exactly the {stage} fields");

            // And it covers every field the stage's view declares.
            var view = ViewToOperation().Single(row => (string)row[2]! == stage);
            foreach (var viewField in ViewFieldsOf((string)view[0]!))
            {
                var name = OperationAspects.PropertyNameFor(viewField);
                name.ShouldNotBeNull();
                writable.Select(field => field.Name).ShouldContain(name);
            }

            stageFields[stage] = [.. writable.Select(field => field.Name).OrderBy(name => name, StringComparer.Ordinal)];
        }

        // The stages are distinct gates: no two admit the same field set, and none carries the
        // whole rental the way the removed union aspect did.
        var signatures = stageFields.Values
            .Select(fields => string.Join("|", fields))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
        signatures.Length.ShouldBe(stageFields.Count);

        var union = stageFields.Values.SelectMany(fields => fields).Distinct(StringComparer.Ordinal).ToArray();
        union.Length.ShouldBeGreaterThan(10);
        foreach (var fields in stageFields.Values)
            fields.Length.ShouldBeLessThan(union.Length);
    }

    [Fact]
    public void Every_rental_stage_aspect_is_registered_under_its_own_iri()
    {
        OperationAspects.RentalOperationIris.Count.ShouldBe(OperationAspects.RentalStages.Count);
        OperationAspects.RentalOperationIris.Distinct(StringComparer.Ordinal).Count()
            .ShouldBe(OperationAspects.RentalStages.Count);

        // The stage key is the last segment of the aspect IRI and of the view shape IRI, and the
        // view binds the stage's own aspect — the names for one stage cannot drift apart.
        var servedTtls = ViewAspectsTests.ServedShapes().Select(row => (string)row[1]!).ToArray();
        foreach (var stage in OperationAspects.RentalStages)
        {
            var aspectIri = OperationAspects.RentalOperationIriFor(stage);
            aspectIri.ShouldEndWith($":rental:{stage}");

            servedTtls.Any(ttl => ttl.Contains($"<urn:aletheia:homestia:shapes:rental:{stage}>", StringComparison.Ordinal))
                .ShouldBeTrue($"no served view declares the {stage} shape");

            servedTtls.Any(ttl => ttl.Contains(aspectIri, StringComparison.Ordinal))
                .ShouldBeTrue($"no served view binds the {stage} operation aspect");
        }

        // An unknown stage is a caller error, not a silent fallback to some other gate.
        Should.Throw<ArgumentOutOfRangeException>(() => OperationAspects.RentalOperationIriFor("not-a-stage"));
    }

    [Fact]
    public void RegisterOperationAspects_registers_the_full_operation_family()
    {
        var store = CreateStore();

        Should.NotThrow(() => OperationAspects.RegisterOperationAspects(store));

        // One per entity the host writes, plus one per rental lifecycle stage.
        store.OperationIris.ShouldBe(
            [
                OperationAspects.PropertyOperationIri,
                OperationAspects.RoomOperationIri,
                OperationAspects.TenantOperationIri,
                OperationAspects.LandlordOperationIri,
                .. OperationAspects.RentalOperationIris,
            ],
            ignoreOrder: true);
    }

    /// <summary>
    /// The write gates state the ownership rule, and they state it as a DENIAL: the context pass
    /// turns every returned row into a violation, so the clause must fire when the caller is NOT
    /// the owner. Written the other way round it would refuse the owner and admit everyone else —
    /// a gate that is worse than none, because it looks like protection.
    /// <br/><br/>
    /// Two conditions ride along and are asserted here because removing either is silent:
    /// <list type="bullet">
    /// <item><description><c>FILTER(bound(?agentIri))</c> — an anonymous caller (local development,
    /// or a deployment with no identity provider) leaves the gate open, which is the platform's
    /// permissive default.</description></item>
    /// <item><description><c>FILTER EXISTS { ?entityIri ?anyPredicate ?anyObject }</c> — the context
    /// pass runs BEFORE the operation's own triples land, so a record that does not exist yet is a
    /// create; judging it by what it will hold would refuse every create.</description></item>
    /// </list>
    /// </summary>
    [Fact]
    public void Every_ownership_gate_states_the_rule_it_enforces()
    {
        var store = CreateStore();
        OperationAspects.RegisterOperationAspects(store);

        var propertyPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Property));
        var roomPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Room));
        var landlordPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Landlord));
        var rentalPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Rental));

        string GateOf(string iri) => store.ResolveOperation(iri).ContextWhere
            ?? throw new InvalidOperationException($"'{iri}' carries no ownership gate.");

        // A property belongs to the landlord it carries, and that landlord names the agent.
        var property = GateOf(OperationAspects.PropertyOperationIri);
        property.ShouldContain($"?entityIri <{propertyPredicates["Landlord"]}> ?landlord");
        property.ShouldContain($"<{landlordPredicates["Agent"]}> ?agentIri");

        // A room reaches a landlord only through the property it is part of.
        var room = GateOf(OperationAspects.RoomOperationIri);
        room.ShouldContain($"?entityIri <{roomPredicates["IsPartOf"]}> ?property");
        room.ShouldContain($"?property <{propertyPredicates["Landlord"]}> ?landlord");
        room.ShouldContain($"<{landlordPredicates["Agent"]}> ?agentIri");

        // A landlord is owned by the agent it names.
        var landlord = GateOf(OperationAspects.LandlordOperationIri);
        landlord.ShouldContain($"?entityIri <{landlordPredicates["Agent"]}> ?agentIri");

        var gates = new List<string> { property, room, landlord };

        // A rental reaches a landlord the same way a room does, through the property it is for.
        // Every stage selects its own aspect, so every stage gate has to carry the rule.
        foreach (var stage in OperationAspects.RentalStages)
        {
            var rental = GateOf(OperationAspects.RentalOperationIriFor(stage));
            rental.ShouldContain($"?entityIri <{rentalPredicates["Property"]}> ?property");
            rental.ShouldContain($"?property <{propertyPredicates["Landlord"]}> ?landlord");
            rental.ShouldContain($"<{landlordPredicates["Agent"]}> ?agentIri");
            gates.Add(rental);
        }

        foreach (var gate in gates)
        {
            gate.ShouldContain("FILTER NOT EXISTS");
            gate.ShouldContain("FILTER(bound(?agentIri))");
            gate.ShouldContain("FILTER EXISTS { ?entityIri ?anyPredicate ?anyObject }");
        }
    }

    /// <summary>
    /// A rental is judged by its stage's fields AND by ownership: every stage gate carries the
    /// denial clause, so a landlord cannot advance a rental for a property it does not own. The
    /// tenant stays ungated — a tenant is not owned through a landlord.
    /// </summary>
    [Fact]
    public void The_rental_stage_gates_carry_the_ownership_rule()
    {
        var store = CreateStore();
        OperationAspects.RegisterOperationAspects(store);

        foreach (var stage in OperationAspects.RentalStages)
            store.ResolveOperation(OperationAspects.RentalOperationIriFor(stage)).ContextWhere
                .ShouldNotBeNull();

        store.ResolveOperation(OperationAspects.TenantOperationIri).ContextWhere.ShouldBeNull();
    }

    [Fact]
    public void Operation_aspects_stay_out_of_the_other_families()
    {
        var store = CreateStore();
        ViewAspects.RegisterViews(store);
        QueryAspects.RegisterQueryAspects(store);
        OperationAspects.RegisterOperationAspects(store);

        store.ViewIris.ShouldNotContain(OperationAspects.PropertyOperationIri);
        store.QueryIris.ShouldNotContain(OperationAspects.PropertyOperationIri);
    }

    [Fact]
    public void The_shape_carries_the_views_validation_rules()
    {
        // The operation shape is not only a field whitelist: it judges each admitted value the
        // way the view does, so the server enforces what the form promises.
        var property = ShapeAdmitting(typeof(Property));
        property.ShouldContain("sh:minCount 1");        // name, address, propertyType
        property.ShouldContain("sh:minLength 5");       // address
        property.ShouldContain("sh:datatype xsd:string");
        property.ShouldContain("sh:nodeKind sh:IRI");   // propertyType, rentalModel

        var room = ShapeAdmitting(typeof(Room));
        room.ShouldContain("sh:minInclusive 1");        // roomSize
        room.ShouldContain("sh:maxInclusive 1000");
        room.ShouldContain("sh:minLength 2");           // location
    }

    [Fact]
    public void A_rental_stage_carries_exactly_the_presence_rules_its_view_declares()
    {
        // The gate a stage's save selects requires what that stage's form requires — and nothing
        // from another stage, which a union aspect could not express without rejecting the save.
        var application = ShapeAdmitting(typeof(Rental), "application");
        application.ShouldContain("sh:minCount 1");        // property, tenant, viewingDate
        application.ShouldContain("sh:nodeKind sh:IRI");
        application.ShouldContain("sh:datatype xsd:string");

        var deposit = ShapeAdmitting(typeof(Rental), "deposit");
        deposit.ShouldContain("sh:minCount 1");            // depositAmount
        deposit.ShouldContain("sh:datatype xsd:decimal");
        deposit.ShouldContain("sh:minInclusive 0");
        deposit.ShouldContain("sh:datatype xsd:boolean");  // depositPaid

        // Stage 5 declares no required field at all, so its gate carries no presence rule.
        var tenancy = ShapeAdmitting(typeof(Rental), "tenancy");
        tenancy.ShouldNotContain("sh:minCount");
        tenancy.ShouldContain("sh:datatype xsd:boolean");

        // A stage never borrows another stage's fields.
        var rentalPredicates = EntityQueryPredicates.ResolvePredicateIris(typeof(Rental));
        tenancy.ShouldNotContain($"<{rentalPredicates["ViewingDate"]}>");
        tenancy.ShouldNotContain($"<{rentalPredicates["DepositAmount"]}>");
    }

    /// <summary>
    /// An <c>[Owning]</c> collection is stored as an <c>rdf:List</c>: non-empty, its object is the
    /// list head — a blank node — and empty it is <c>rdf:nil</c>, which is an IRI. A rule written
    /// for a single reference (<c>sh:nodeKind sh:IRI</c>) therefore accepts the EMPTY collection
    /// and rejects a non-empty one, and <c>sh:minCount 1</c> is satisfied by the <c>rdf:nil</c>
    /// triple. Both are exactly backwards, and both are silent: the write is admitted with the
    /// documents dropped, or refused with them attached, and the graph looks fine either way.
    /// <br/><br/>
    /// Declaring the field as a collection is what selects the right term. This guard keeps a
    /// future collection field from being declared as a reference — the mistake that cost the
    /// Contract stage its save.
    /// </summary>
    [Fact]
    public void Every_owning_collection_field_is_declared_as_one()
    {
        var declared = new List<(Type Entity, AspectField Field)>();
        foreach (var entity in new[] { typeof(Property), typeof(Room), typeof(Tenant) })
            declared.AddRange(WritableFieldsFor(entity, string.Empty).Select(field => (entity, field)));
        foreach (var stage in OperationAspects.RentalStages)
            declared.AddRange(WritableFieldsFor(typeof(Rental), stage).Select(field => (typeof(Rental), field)));

        declared.ShouldNotBeEmpty();

        foreach (var (entity, field) in declared)
        {
            var isCollection = entity.GetProperty(field.Name)?.PropertyType is { IsGenericType: true } type
                && type.GetGenericTypeDefinition() == typeof(EntityRefCollection<>);

            field.IsOwningCollection.ShouldBe(
                isCollection,
                $"{entity.Name}.{field.Name} must be declared IsOwningCollection: an owning collection is an " +
                "rdf:List, so a rule written for a reference describes the opposite of the stored graph");
        }

        // The term that goes with it: at least one member is the list being non-empty.
        var contract = ShapeAdmitting(typeof(Rental), "contract");
        contract.ShouldContain("sh:nodeKind sh:BlankNode");
        contract.ShouldNotContain("sh:minCount");
    }

    [Fact]
    public void A_shape_is_valid_turtle()
    {
        // The store parses a shape at registration, so a stray trailing separator
        // throws there. Asserted on the text as well, because the failure would
        // otherwise only surface at host startup.
        var shape = ShapeAdmitting(typeof(Tenant));

        shape.TrimEnd().ShouldEndWith(".");
        shape.ShouldNotContain("; .");
        // The SDK rejects a targetless operation shape at registration — every
        // part must declare the entity it governs.
        shape.ShouldContain("sh:targetClass <");
        PathsOf(shape).Count().ShouldBe(OperationAspects.TenantWritableFields.Count);
    }
}
