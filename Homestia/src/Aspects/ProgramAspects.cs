using Aletheia.Sdk.Aspects.Abstractions;
using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.Message;
using Aletheia.Sdk.Aspects.Operation;
using Aletheia.Sdk.Aspects.Query;

namespace Aletheia.Sdk.Program.Aspects;

/// <summary>
/// Registers all capability-level aspects — guards that run before a
/// <c>[Capability]</c> handler executes. Uses SHACL shapes for validation.
/// </summary>
public static class CapabilityAspects
{
    public static void RegisterCapabilityAspects(this IAspectStore aspectStore)
    {
        // Greet capability aspect: ensures the name is at least 2 characters.
        var greetAspect = new InlineTtlMessageAspect("urn:aletheia:aspects:greet-v1", """
            @prefix sh:   <http://www.w3.org/ns/shacl#> .
            @prefix aletheia: <https://www.aletheia.arkenforge.de/> .
            <urn:aletheia:aspects:greet-shape>
                a sh:NodeShape ;
                sh:targetClass <urn:Aletheia.Sdk.Program.Capabilities.GreetCommand> ;
                sh:property [
                    sh:path aletheia:Name ; sh:minLength 2 ;
                    sh:message "The greeting name must be at least 2 characters." ;
                ] .
            """);
        AspectValidation.ValidateTtl(greetAspect.ShapeTtl, greetAspect.Iri);
        aspectStore.RegisterMessage(greetAspect);
        aspectStore.RegisterCapabilityAspect(new CapabilityAspect
        {
            Iri = "urn:aletheia:aspects:capability:greet-v1",
            CommandAspectIri = "urn:aletheia:aspects:greet-v1"
        });
    }
}

/// <summary>
/// Registers all entity operation aspects — guards that run before CRUD
/// operations on <c>[Entity]</c> types. Uses SHACL shapes for validation.
/// </summary>
public static class OperationAspects
{
    public static void RegisterOperationAspects(this IAspectStore aspectStore)
    {
        // DataRecord write aspect: ensures Label is non-empty on create/update.
        var dataRecordAspect = new InlineTtlOperationAspect(
            "urn:aletheia:aspects:data-record-write-v1",
            """
            @prefix sh:          <http://www.w3.org/ns/shacl#> .
            @prefix datarecords: <https://www.aletheia.arkenforge.de/predicates/data-records/> .
            <urn:aletheia:aspects:data-record-shape>
                a sh:NodeShape ;
                sh:targetClass <https://www.aletheia.arkenforge.de/types/data-records> ;
                sh:property [
                    sh:path datarecords:label ; sh:minCount 1 ; sh:minLength 1 ;
                    sh:message "A DataRecord must have a non-empty label." ;
                ] .
            """,
            null);
        AspectValidation.ValidateTtl(dataRecordAspect.LocalShapeTtl, dataRecordAspect.Iri);
        aspectStore.RegisterOperation(dataRecordAspect);
    }
}

/// <summary>
/// Registers all query aspects — guards that filter entity queries.
/// Uses SPARQL WHERE clauses for graph-pattern constraints.
/// </summary>
public static class QueryAspects
{
    public static void RegisterQueryAspects(this IAspectStore aspectStore)
    {
        // DataRecord query aspect: only return active records.
        var activeOnly = new InlineTtlQueryAspect(
            "urn:aletheia:aspects:data-record-query-v1",
            """
                ?record <https://www.aletheia.arkenforge.de/predicates/data-records/active> ?active .
                FILTER(?active = true)
            """,
            null);
        AspectValidation.ValidateSparql(activeOnly.FilterWhere, activeOnly.Iri);
        aspectStore.RegisterQuery(activeOnly);
    }
}

/// <summary>
/// Registers all object-level aspects — guards for <c>[ObjectBearing]</c>
/// upload routes. These apply to the object storage pipeline.
/// </summary>
public static class ObjectAspects
{
    public static void RegisterObjectAspects(this IAspectStore aspectStore)
    {
        // Placeholder — no object aspects defined yet for the Program slice.
    }
}
