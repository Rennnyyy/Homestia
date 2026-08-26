using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.View;

namespace Aletheia.Sdk.Program.Aspects;

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
    /// Property shape: <c>name</c> and <c>address</c> required, <c>propertyType</c>
    /// must be an IRI reference, <c>rentalModel</c> optional, and <c>rooms</c>
    /// recursively validated against the Room shape — one graph, one pass.
    /// </summary>
    public const string PropertyTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://www.aletheia.arkenforge.de/json/> .

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
                sh:description "IRI reference to the property type; discover valid IRIs via the list tool." ;
                sh:minCount 1 ; sh:nodeKind sh:IRI ;
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
                sh:node <urn:aletheia:homestia:shapes:room> ;
                sh:message "shape.property.rooms" ;
            ] .
        """;

    /// <summary>
    /// Room shape: <c>name</c> and a numeric <c>roomSize</c> (1–1000 m²) required,
    /// optional <c>location</c>, and IRI references for <c>furnishingStatus</c>
    /// and <c>roomStatus</c>.
    /// </summary>
    public const string RoomTtl = """
        @prefix sh:   <http://www.w3.org/ns/shacl#> .
        @prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
        @prefix json: <https://www.aletheia.arkenforge.de/json/> .

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
                sh:description "The room's area in square metres, between 1 and 1000." ;
                sh:minCount 1 ; sh:datatype xsd:decimal ;
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
    /// Registers every frontend view into the SDK's aspect store. The SDK
    /// validates the Turtle syntax at registration. Must run before the
    /// store's first resolve (it seals), alongside the other registrations.
    /// </summary>
    public static void RegisterViews(IAspectStore store)
    {
        ArgumentNullException.ThrowIfNull(store);

        store.RegisterView(new InlineTtlViewAspect(PropertyShapeIri, PropertyTtl));
        store.RegisterView(new InlineTtlViewAspect(RoomShapeIri, RoomTtl));
    }
}
