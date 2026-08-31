/**
 * Test fixtures — the frontend shapes, mirroring the TTL authored in the
 * backend's FrontendShapes catalog. At runtime the browser fetches the real
 * shapes from /api/shapes; tests pin identical copies so the unit suite
 * fails if the contract drifts.
 */

export const PROPERTY_TTL = `
@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix json: <https://aletheia.katharsis.digital/json/> .

<urn:aletheia:homestia:shapes:property>
    a sh:NodeShape ;
    sh:targetClass <urn:aletheia:homestia:Property> ;
    sh:property [
        sh:path json:name ; sh:order 1 ;
        sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
        sh:message "shape.property.name" ;
    ] ;
    sh:property [
        sh:path json:address ; sh:order 2 ;
        sh:minCount 1 ; sh:minLength 5 ; sh:datatype xsd:string ;
        sh:message "shape.property.address" ;
    ] ;
    sh:property [
        sh:path json:propertyType ; sh:order 3 ;
        sh:minCount 1 ; sh:nodeKind sh:IRI ;
        sh:message "shape.property.propertyType" ;
    ] ;
    sh:property [
        sh:path json:rentalModel ; sh:order 4 ;
        sh:nodeKind sh:IRI ;
        sh:message "shape.property.rentalModel" ;
    ] ;
    sh:property [
        sh:path json:rooms ; sh:order 5 ;
        sh:node <urn:aletheia:homestia:shapes:room> ;
        sh:message "shape.property.rooms" ;
    ] .
`;

export const ROOM_TTL = `
@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix json: <https://aletheia.katharsis.digital/json/> .

<urn:aletheia:homestia:shapes:room>
    a sh:NodeShape ;
    sh:targetClass <urn:aletheia:homestia:Room> ;
    sh:property [
        sh:path json:name ; sh:order 1 ;
        sh:minCount 1 ; sh:minLength 1 ; sh:datatype xsd:string ;
        sh:message "shape.room.name" ;
    ] ;
    sh:property [
        sh:path json:location ; sh:order 2 ;
        sh:minLength 2 ; sh:datatype xsd:string ;
        sh:message "shape.room.location" ;
    ] ;
    sh:property [
        sh:path json:roomSize ; sh:order 3 ;
        sh:minCount 1 ; sh:datatype xsd:decimal ;
        sh:minInclusive 1 ; sh:maxInclusive 1000 ;
        sh:message "shape.room.roomSize" ;
    ] ;
    sh:property [
        sh:path json:furnishingStatus ; sh:order 4 ;
        sh:nodeKind sh:IRI ;
        sh:message "shape.room.furnishingStatus" ;
    ] ;
    sh:property [
        sh:path json:roomStatus ; sh:order 5 ;
        sh:nodeKind sh:IRI ;
        sh:message "shape.room.roomStatus" ;
    ] .
`;

/** Fixture shapes keyed by shape IRI, as the client would serve them. */
export const SHAPE_FIXTURES: Record<string, string> = {
  'urn:aletheia:homestia:shapes:property': PROPERTY_TTL,
  'urn:aletheia:homestia:shapes:room': ROOM_TTL,
};
