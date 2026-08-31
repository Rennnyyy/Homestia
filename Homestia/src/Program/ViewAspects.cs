using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.View;

namespace Homestia.Aspects;

/// <summary>
/// Frontend-purpose views — the form shapes of Homestia.
/// <br/><br/>
/// These views are <strong>not</strong> enforcement aspects: the backend's
/// operation aspects remain the authoritative protection. Registered as the
/// SDK's view family, they are served by the exploration endpoints
/// (<c>GET api/entities/aspect-definitions/{iri}/view</c>) and judged on
/// demand by the view aspect engine
/// (<c>POST api/entities/aspect-definitions/{iri}/validate</c>) — the browser
/// sends form values, the backend reports findings of every severity mapped
/// to JSON paths. Registration fails fast on malformed views.
/// <list type="bullet">
/// <item><description><strong>Validation feedback</strong> — form values are
/// validated by the backend view engine before they are sent.</description></item>
/// <item><description><strong>View configuration</strong> — each
/// <c>sh:property</c> is a JSON key; <c>sh:order</c> defines field and column
/// order; <c>sh:message</c> holds an i18n key.</description></item>
/// </list>
/// </summary>
public static class ViewAspects
{
    /// <summary>IRI of the Property shape (composite root for rooms).</summary>
    public const string PropertyShapeIri = "urn:aletheia:homestia:shapes:property";

    /// <summary>IRI of the Room shape (nested via <c>sh:node</c>).</summary>
    public const string RoomShapeIri = "urn:aletheia:homestia:shapes:room";

    /// <summary>
    /// IRI of the lenient Property shape used by AI fill scenarios. Same field
    /// contract as the strict shape, but nothing is required — the AI may fill
    /// only part of the form and the flow still succeeds; missing fields are
    /// surfaced as warnings in the UI for the user to complete.
    /// </summary>
    public const string AiPropertyShapeIri = "urn:aletheia:homestia:shapes:property:ai";

    /// <summary>IRI of the lenient Room shape used by AI fill scenarios.</summary>
    public const string AiRoomShapeIri = "urn:aletheia:homestia:shapes:room:ai";

    /// <summary>IRI of the Rental shape for Stage 1 · Application.</summary>
    public const string RentalApplicationShapeIri = "urn:aletheia:homestia:shapes:rental:application";

    /// <summary>IRI of the Rental shape for Stage 2 · Contract.</summary>
    public const string RentalContractShapeIri = "urn:aletheia:homestia:shapes:rental:contract";

    /// <summary>IRI of the Rental shape for Stage 3 · Deposit.</summary>
    public const string RentalDepositShapeIri = "urn:aletheia:homestia:shapes:rental:deposit";

    /// <summary>IRI of the Rental shape for Stage 4 · Handover.</summary>
    public const string RentalHandoverShapeIri = "urn:aletheia:homestia:shapes:rental:handover";

    /// <summary>IRI of the Rental shape for Stage 5 · Tenancy.</summary>
    public const string RentalTenancyShapeIri = "urn:aletheia:homestia:shapes:rental:tenancy";

    /// <summary>IRI of the Rental shape for Stage 6 · Termination Noticed.</summary>
    public const string RentalNoticedShapeIri = "urn:aletheia:homestia:shapes:rental:noticed";

    /// <summary>IRI of the Rental shape for Stage 7 · Handback.</summary>
    public const string RentalHandbackShapeIri = "urn:aletheia:homestia:shapes:rental:handback";

    /// <summary>IRI of the Rental shape for Stage 8 · Terminated.</summary>
    public const string RentalTerminatedShapeIri = "urn:aletheia:homestia:shapes:rental:terminated";

    /// <summary>
    /// Property shape: <c>name</c> and <c>address</c> required, <c>propertyType</c>
    /// must be an IRI reference, <c>rentalModel</c> optional, and <c>rooms</c>
    /// recursively validated against the Room shape — one graph, one pass.
    /// </summary>
    public const string PropertyTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:property>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Property> ;
            sh:property [
                sh:path json:name ; sh:order 1 ;
                sh:description "A short human-readable name for the property." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.property.name" ;
            ] ;
            sh:property [
                sh:path json:address ; sh:order 2 ;
                sh:description "The full postal address of the property." ;
                sh:minCount 1 ; sh:minLength 5 ; sh:datatype xsd:string ;
                sh:message "shape.property.address" ;
            ] ;
            sh:property [
                sh:path json:propertyType ; sh:order 3 ;
                sh:description "Choose the type of property." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.property.propertyType" ;
            ] ;
            sh:property [
                sh:path json:rentalModel ; sh:order 4 ;
                sh:description "Choose how the property is rented (optional)." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.property.rentalModel" ;
            ] ;
            sh:property [
                sh:path json:rooms ; sh:order 5 ;
                sh:description "The rooms of this property; each validated against the room shape." ;
                sh:node <urn:aletheia:homestia:shapes:room> ;
                sh:message "shape.property.rooms" ;
            ] .
        """;

    /// <summary>
    /// Room shape: <c>name</c> required, a numeric <c>roomSize</c> (1–1000 m²)
    /// optional, <c>location</c> optional, and IRI references for
    /// <c>furnishingStatus</c> and <c>roomStatus</c>.
    /// </summary>
    public const string RoomTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:room>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Room> ;
            sh:property [
                sh:path json:name ; sh:order 1 ;
                sh:description "A short name for the room, e.g. 'Kitchen' or 'Room 1'." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.room.name" ;
            ] ;
            sh:property [
                sh:path json:location ; sh:order 2 ;
                sh:description "Optional location or floor within the property." ;
                sh:minLength 2 ; sh:datatype xsd:string ;
                sh:message "shape.room.location" ;
            ] ;
            sh:property [
                sh:path json:roomSize ; sh:order 3 ;
                sh:description "The room's area in square metres, between 1 and 1000 (optional)." ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 1 ; sh:maxInclusive 1000 ;
                sh:message "shape.room.roomSize" ;
            ] ;
            sh:property [
                sh:path json:furnishingStatus ; sh:order 4 ;
                sh:description "Choose how furnished the room is." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.room.furnishingStatus" ;
            ] ;
            sh:property [
                sh:path json:roomStatus ; sh:order 5 ;
                sh:description "Choose the current room status." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.room.roomStatus" ;
            ] .
        """;

    /// <summary>
    /// Lenient Property shape for AI fills: the same field contract as
    /// <see cref="PropertyTtl"/> but with no required fields, so a partial
    /// output passes and the user completes the rest manually.
    /// </summary>
    public const string AiPropertyTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:property:ai>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Property:ai> ;
            sh:property [
                sh:path json:name ; sh:order 1 ;
                sh:description "A short human-readable name for the property." ;
                sh:datatype xsd:string ;
                sh:message "shape.property.name" ;
            ] ;
            sh:property [
                sh:path json:address ; sh:order 2 ;
                sh:description "The full postal address of the property." ;
                sh:datatype xsd:string ;
                sh:message "shape.property.address" ;
            ] ;
            sh:property [
                sh:path json:propertyType ; sh:order 3 ;
                sh:description "IRI reference to the property type; discover valid IRIs via the list tool." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.property.propertyType" ;
            ] ;
            sh:property [
                sh:path json:rentalModel ; sh:order 4 ;
                sh:description "Optional IRI reference to the rental model." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.property.rentalModel" ;
            ] ;
            sh:property [
                sh:path json:rooms ; sh:order 5 ;
                sh:description "The rooms of this property; each validated against the room shape." ;
                sh:node <urn:aletheia:homestia:shapes:room:ai> ;
                sh:message "shape.property.rooms" ;
            ] .
        """;

    /// <summary>
    /// Lenient Room shape for AI fills — no required fields, same contract.
    /// </summary>
    public const string AiRoomTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:room:ai>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Room:ai> ;
            sh:property [
                sh:path json:name ; sh:order 1 ;
                sh:description "A short name for the room, e.g. 'Kitchen' or 'Room 1'." ;
                sh:datatype xsd:string ;
                sh:message "shape.room.name" ;
            ] ;
            sh:property [
                sh:path json:location ; sh:order 2 ;
                sh:description "Optional location or floor within the property." ;
                sh:datatype xsd:string ;
                sh:message "shape.room.location" ;
            ] ;
            sh:property [
                sh:path json:roomSize ; sh:order 3 ;
                sh:description "The room's area in square metres, between 1 and 1000." ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 1 ; sh:maxInclusive 1000 ;
                sh:message "shape.room.roomSize" ;
            ] ;
            sh:property [
                sh:path json:furnishingStatus ; sh:order 4 ;
                sh:description "Optional IRI reference to the furnishing status." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.room.furnishingStatus" ;
            ] ;
            sh:property [
                sh:path json:roomStatus ; sh:order 5 ;
                sh:description "Optional IRI reference to the room status." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.room.roomStatus" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 1 · Application shape: the property (and optional room),
    /// the tenant, and the apartment viewing date. Validating this stage
    /// unlocks the Contract stage.
    /// </summary>
    public const string RentalApplicationTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:application>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:application> ;
            sh:property [
                sh:path json:property ; sh:order 1 ;
                sh:description "Choose the property being rented." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.rental.property" ;
            ] ;
            sh:property [
                sh:path json:unit ; sh:order 2 ;
                sh:description "Choose the room, for single-room (shared living) rentals." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.rental.unit" ;
            ] ;
            sh:property [
                sh:path json:tenant ; sh:order 3 ;
                sh:description "Choose the tenant for this rental." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.rental.tenant" ;
            ] ;
            sh:property [
                sh:path json:viewingDate ; sh:order 4 ;
                sh:description "Pick the date of the apartment viewing." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.viewingDate" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 2 · Contract shape: at least one uploaded contract
    /// document. Each document is an object-bearing entity referenced by IRI;
    /// the collection must be non-empty for the stage to validate.
    /// </summary>
    public const string RentalContractTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:contract>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:contract> ;
            sh:property [
                sh:path json:rentalDocuments ; sh:order 1 ;
                sh:description "Upload the signed contract documents (each file is stored as an object)." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.rental.rentalDocuments" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 3 · Deposit shape: deposit amount, payment status, and the
    /// optional payment date. Validating this stage unlocks the Handover stage.
    /// </summary>
    public const string RentalDepositTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:deposit>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:deposit> ;
            sh:property [
                sh:path json:depositAmount ; sh:order 1 ;
                sh:description "Deposit amount in euros." ;
                sh:minCount 1 ; sh:datatype xsd:decimal ;
                sh:minInclusive 0 ;
                sh:message "shape.rental.depositAmount" ;
            ] ;
            sh:property [
                sh:path json:depositPaid ; sh:order 2 ;
                sh:description "Whether the deposit has been paid." ;
                sh:datatype xsd:boolean ;
                sh:message "shape.rental.depositPaid" ;
            ] ;
            sh:property [
                sh:path json:depositPaymentDate ; sh:order 3 ;
                sh:description "When the deposit was paid." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.depositPaymentDate" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 4 · Handover shape: keys/property handover date and optional
    /// protocol notes. Validating this stage unlocks the Tenancy stage.
    /// </summary>
    public const string RentalHandoverTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:handover>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:handover> ;
            sh:property [
                sh:path json:handoverDate ; sh:order 1 ;
                sh:description "Keys/property handover date." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handoverDate" ;
            ] ;
            sh:property [
                sh:path json:handoverNotes ; sh:order 2 ;
                sh:description "Handover protocol notes." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handoverNotes" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 5 · Tenancy shape: the resting state of the agreement.
    /// Confirming the tenancy is active unlocks the Termination Noticed stage.
    /// </summary>
    public const string RentalTenancyTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:tenancy>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:tenancy> ;
            sh:property [
                sh:path json:tenancyActive ; sh:order 1 ;
                sh:description "Confirms the tenancy is active." ;
                sh:datatype xsd:boolean ;
                sh:message "shape.rental.tenancyActive" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 6 · Termination Noticed shape: when the termination notice
    /// was given and the optional reason. Validating this stage unlocks the
    /// Handback stage.
    /// </summary>
    public const string RentalNoticedTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:noticed>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:noticed> ;
            sh:property [
                sh:path json:noticeDate ; sh:order 1 ;
                sh:description "When the termination notice was given." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.noticeDate" ;
            ] ;
            sh:property [
                sh:path json:noticeReason ; sh:order 2 ;
                sh:description "Termination reason." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.noticeReason" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 7 · Handback shape: keys/property handback date, optional
    /// notes, and whether damage was confirmed. Validating this stage unlocks
    /// the Terminated stage.
    /// </summary>
    public const string RentalHandbackTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:handback>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:handback> ;
            sh:property [
                sh:path json:handbackDate ; sh:order 1 ;
                sh:description "Keys/property handback date." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handbackDate" ;
            ] ;
            sh:property [
                sh:path json:handbackNotes ; sh:order 2 ;
                sh:description "Handback protocol notes." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handbackNotes" ;
            ] ;
            sh:property [
                sh:path json:damageConfirmed ; sh:order 3 ;
                sh:description "Whether damage was confirmed at handback." ;
                sh:datatype xsd:boolean ;
                sh:message "shape.rental.damageConfirmed" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 8 · Terminated shape: final financial settlement date,
    /// whether the deposit was returned, and settlement notes. The last stage
    /// of the agreement lifecycle.
    /// </summary>
    public const string RentalTerminatedTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:terminated>
            a sh:NodeShape ;
            sh:targetClass <urn:aletheia:homestia:Rental:terminated> ;
            sh:property [
                sh:path json:settlementDate ; sh:order 1 ;
                sh:description "Final financial settlement date." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.settlementDate" ;
            ] ;
            sh:property [
                sh:path json:depositReturned ; sh:order 2 ;
                sh:description "Whether the deposit was returned." ;
                sh:datatype xsd:boolean ;
                sh:message "shape.rental.depositReturned" ;
            ] ;
            sh:property [
                sh:path json:settlementNotes ; sh:order 3 ;
                sh:description "Final settlement notes." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.settlementNotes" ;
            ] .
        """;

    /// <summary>
    /// Registers every frontend view into the SDK's aspect store. The SDK
    /// validates the Turtle syntax at registration. Must run before the
    /// store's first resolve (it seals), alongside the other registrations.
    /// </summary>
    public static void RegisterViews(IAspectStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        store.RegisterView(new InlineTtlViewAspect(PropertyShapeIri, PropertyTtl));
        store.RegisterView(new InlineTtlViewAspect(RoomShapeIri, RoomTtl));
        store.RegisterView(new InlineTtlViewAspect(AiPropertyShapeIri, AiPropertyTtl));
        store.RegisterView(new InlineTtlViewAspect(AiRoomShapeIri, AiRoomTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalApplicationShapeIri, RentalApplicationTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalContractShapeIri, RentalContractTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalDepositShapeIri, RentalDepositTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalHandoverShapeIri, RentalHandoverTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalTenancyShapeIri, RentalTenancyTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalNoticedShapeIri, RentalNoticedTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalHandbackShapeIri, RentalHandbackTtl));
        store.RegisterView(new InlineTtlViewAspect(RentalTerminatedShapeIri, RentalTerminatedTtl));
    }
}
