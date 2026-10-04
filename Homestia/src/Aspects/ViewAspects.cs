using Aletheia.Sdk.Aspects.Abstractions;
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

    /// <summary>IRI of the Tenant shape (used by the inline tenant quick-create).</summary>
    public const string TenantShapeIri = "urn:aletheia:homestia:shapes:tenant";

    /// <summary>
    /// IRI of the Landlord shape. No form renders it: a page never asks a user who their landlord
    /// is, it resolves the caller's own landlord and binds it. The shape exists as the CLAIM that
    /// licenses the landlord's aspects — a page may only carry an aspect IRI one of its own views
    /// declares — and as the field surface the exploration endpoint describes.
    /// </summary>
    public const string LandlordShapeIri = "urn:aletheia:homestia:shapes:landlord";

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
    public const string PropertyTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:property>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.PropertyOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.PropertyQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Property> ;
            sh:property [
                sh:path json:name ; sh:name "Name"@en, "Name"@de ; sh:order 1 ;
                sh:description "A short human-readable name for the property." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.property.name" ;
            ] ;
            sh:property [
                sh:path json:address ; sh:name "Address"@en, "Adresse"@de ; sh:order 2 ;
                sh:description "The full postal address of the property." ;
                sh:minCount 1 ; sh:minLength 5 ; sh:datatype xsd:string ;
                sh:message "shape.property.address" ;
            ] ;
            sh:property [
                sh:path json:propertyType ; sh:name "Property Type"@en, "Objekttyp"@de ; sh:order 3 ;
                sh:description "Choose the type of property." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.property.propertyType" ;
            ] ;
            sh:property [
                sh:path json:rentalModel ; sh:name "Rental Model"@en, "Mietmodell"@de ; sh:order 4 ;
                sh:description "Choose how the property is rented (optional)." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.property.rentalModel" ;
            ] ;
            sh:property [
                sh:path json:rooms ; sh:name "Rooms"@en, "Räume"@de ; sh:order 5 ;
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
    public const string RoomTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:room>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RoomOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RoomQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Room> ;
            sh:property [
                sh:path json:name ; sh:name "Name"@en, "Name"@de ; sh:order 1 ;
                sh:description "A short name for the room, e.g. 'Kitchen' or 'Room 1'." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.room.name" ;
            ] ;
            sh:property [
                sh:path json:location ; sh:name "Location"@en, "Lage"@de ; sh:order 2 ;
                sh:description "Optional location or floor within the property." ;
                sh:minLength 2 ; sh:datatype xsd:string ;
                sh:message "shape.room.location" ;
            ] ;
            sh:property [
                sh:path json:roomSize ; sh:name "Room Size"@en, "Zimmergröße"@de ; sh:order 3 ;
                sh:description "The room's area in square metres, between 1 and 1000 (optional)." ;
                sh:datatype xsd:decimal ;
                sh:minInclusive 1 ; sh:maxInclusive 1000 ;
                sh:message "shape.room.roomSize" ;
            ] ;
            sh:property [
                sh:path json:furnishingStatus ; sh:name "Furnishing Status"@en, "Einrichtungsstatus"@de ; sh:order 4 ;
                sh:description "Choose how furnished the room is." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.room.furnishingStatus" ;
            ] ;
            sh:property [
                sh:path json:roomStatus ; sh:name "Room Status"@en, "Zimmerstatus"@de ; sh:order 5 ;
                sh:description "Choose the current room status." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.room.roomStatus" ;
            ] .
        """;

    /// <summary>
    /// Tenant shape: <c>displayName</c> required, <c>email</c> and
    /// <c>phone</c> optional. Governs the inline tenant quick-create so a
    /// tenant is validated like every other form — the create button stays
    /// enabled and violations are fed back against this view.
    /// </summary>
    public const string TenantTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:tenant>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.TenantOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.TenantQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Tenant> ;
            sh:property [
                sh:path json:displayName ; sh:name "Name"@en, "Name"@de ; sh:order 1 ;
                sh:description "The tenant's name." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.tenant.displayName" ;
            ] ;
            sh:property [
                sh:path json:email ; sh:name "Email"@en, "E-Mail"@de ; sh:order 2 ;
                sh:description "The tenant's email address (optional)." ;
                sh:datatype xsd:string ;
                sh:message "shape.tenant.email" ;
            ] ;
            sh:property [
                sh:path json:phone ; sh:name "Phone"@en, "Telefon"@de ; sh:order 3 ;
                sh:description "The tenant's phone number (optional)." ;
                sh:datatype xsd:string ;
                sh:message "shape.tenant.phone" ;
            ] .
        """;

    /// <summary>
    /// Landlord shape: the agent the landlord is represented by (required — the link the ownership
    /// gates resolve), and the property type it deals in. The <c>properties</c> collection is the
    /// read-only inverse of a property's own landlord and is deliberately absent: a form may show
    /// it, but a write never sets it.
    /// </summary>
    public const string LandlordTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:landlord>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.LandlordOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.LandlordQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Landlord> ;
            sh:property [
                sh:path json:agent ; sh:name "Represented By"@en, "Vertreten durch"@de ; sh:order 1 ;
                sh:description "The agent this landlord is represented by." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.landlord.agent" ;
            ] ;
            sh:property [
                sh:path json:landlordType ; sh:name "Landlord Type"@en, "Vermietertyp"@de ; sh:order 2 ;
                sh:description "The type of properties this landlord primarily manages (optional)." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.landlord.landlordType" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 1 · Application shape: the property (and optional room),
    /// the tenant, and the apartment viewing date. Validating this stage
    /// unlocks the Contract stage.
    /// </summary>
    public const string RentalApplicationTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:application>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalApplicationOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:application> ;
            sh:property [
                sh:path json:property ; sh:name "Property"@en, "Objekt"@de ; sh:order 1 ;
                sh:description "Choose the property being rented." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.rental.property" ;
            ] ;
            sh:property [
                sh:path json:unit ; sh:name "Room"@en, "Zimmer"@de ; sh:order 2 ;
                sh:description "Choose the room, for single-room (shared living) rentals." ;
                sh:nodeKind sh:IRI ;
                sh:message "shape.rental.unit" ;
            ] ;
            sh:property [
                sh:path json:tenant ; sh:name "Tenant"@en, "Mieter"@de ; sh:order 3 ;
                sh:description "Choose the tenant for this rental." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.rental.tenant" ;
            ] ;
            sh:property [
                sh:path json:viewingDate ; sh:name "Apartment Viewing Date"@en, "Besichtigungstermin"@de ; sh:order 4 ;
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
    public const string RentalContractTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:contract>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalContractOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:contract> ;
            sh:property [
                sh:path json:rentalDocuments ; sh:name "Contract Documents"@en, "Vertragsunterlagen"@de ; sh:order 1 ;
                sh:description "Upload the signed contract documents (each file is stored as an object)." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
                sh:message "shape.rental.rentalDocuments" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 3 · Deposit shape: deposit amount, payment status, and the
    /// optional payment date. Validating this stage unlocks the Handover stage.
    /// </summary>
    public const string RentalDepositTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:deposit>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalDepositOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:deposit> ;
            sh:property [
                sh:path json:depositAmount ; sh:name "Deposit"@en, "Kaution"@de ; sh:order 1 ;
                sh:description "Deposit amount in euros." ;
                sh:minCount 1 ; sh:datatype xsd:decimal ;
                sh:minInclusive 0 ;
                sh:message "shape.rental.depositAmount" ;
            ] ;
            sh:property [
                sh:path json:depositPaid ; sh:name "Deposit Paid"@en, "Kaution bezahlt"@de ; sh:order 2 ;
                sh:description "Whether the deposit has been paid." ;
                sh:datatype xsd:boolean ;
                sh:message "shape.rental.depositPaid" ;
            ] ;
            sh:property [
                sh:path json:depositPaymentDate ; sh:name "Deposit Payment Date"@en, "Datum der Kautionszahlung"@de ; sh:order 3 ;
                sh:description "When the deposit was paid." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.depositPaymentDate" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 4 · Handover shape: keys/property handover date and optional
    /// protocol notes. Validating this stage unlocks the Tenancy stage.
    /// </summary>
    public const string RentalHandoverTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:handover>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalHandoverOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:handover> ;
            sh:property [
                sh:path json:handoverDate ; sh:name "Handover Date"@en, "Übergabedatum"@de ; sh:order 1 ;
                sh:description "Keys/property handover date." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handoverDate" ;
            ] ;
            sh:property [
                sh:path json:handoverNotes ; sh:name "Handover Notes"@en, "Übergabenotizen"@de ; sh:order 2 ;
                sh:description "Handover protocol notes." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handoverNotes" ;
            ] .
        """;

    /// <summary>
    /// Rental Stage 5 · Tenancy shape: the resting state of the agreement.
    /// Confirming the tenancy is active unlocks the Termination Noticed stage.
    /// </summary>
    public const string RentalTenancyTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:tenancy>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalTenancyOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:tenancy> ;
            sh:property [
                sh:path json:tenancyActive ; sh:name "Tenancy Active"@en, "Mietverhältnis aktiv"@de ; sh:order 1 ;
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
    public const string RentalNoticedTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:noticed>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalNoticedOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:noticed> ;
            sh:property [
                sh:path json:noticeDate ; sh:name "Notice Date"@en, "Kündigungsdatum"@de ; sh:order 1 ;
                sh:description "When the termination notice was given." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.noticeDate" ;
            ] ;
            sh:property [
                sh:path json:noticeReason ; sh:name "Notice Reason"@en, "Kündigungsgrund"@de ; sh:order 2 ;
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
    public const string RentalHandbackTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:handback>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalHandbackOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:handback> ;
            sh:property [
                sh:path json:handbackDate ; sh:name "Handback Date"@en, "Rückgabedatum"@de ; sh:order 1 ;
                sh:description "Keys/property handback date." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handbackDate" ;
            ] ;
            sh:property [
                sh:path json:handbackNotes ; sh:name "Handback Notes"@en, "Rückgabenotizen"@de ; sh:order 2 ;
                sh:description "Handback protocol notes." ;
                sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.handbackNotes" ;
            ] ;
            sh:property [
                sh:path json:damageConfirmed ; sh:name "Damage Confirmed"@en, "Schäden bestätigt"@de ; sh:order 3 ;
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
    public const string RentalTerminatedTtl = $$"""
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://aletheia.katharsis.digital/json/> .

        <urn:aletheia:homestia:shapes:rental:terminated>
            a sh:NodeShape ;
            <{{Aspect.OperationAspectPredicate}}> <{{OperationAspects.RentalTerminatedOperationIri}}> ;
            <{{Aspect.QueryAspectPredicate}}> <{{QueryAspects.RentalStateQueryAspectIri}}> ;
            sh:targetClass <urn:aletheia:homestia:Rental:terminated> ;
            sh:property [
                sh:path json:settlementDate ; sh:name "Settlement Date"@en, "Abrechnungsdatum"@de ; sh:order 1 ;
                sh:description "Final financial settlement date." ;
                sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
                sh:message "shape.rental.settlementDate" ;
            ] ;
            sh:property [
                sh:path json:depositReturned ; sh:name "Deposit Returned"@en, "Kaution zurückgezahlt"@de ; sh:order 2 ;
                sh:description "Whether the deposit was returned." ;
                sh:datatype xsd:boolean ;
                sh:message "shape.rental.depositReturned" ;
            ] ;
            sh:property [
                sh:path json:settlementNotes ; sh:name "Settlement Notes"@en, "Abrechnungsnotizen"@de ; sh:order 3 ;
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
        store.RegisterView(new InlineTtlViewAspect(TenantShapeIri, TenantTtl));
        store.RegisterView(new InlineTtlViewAspect(LandlordShapeIri, LandlordTtl));
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
