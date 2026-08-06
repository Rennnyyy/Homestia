using VDS.RDF;
using VDS.RDF.Parsing;
using VDS.RDF.Query;

namespace Aletheia.Sdk.Program.Aspects;

/// <summary>
/// Registration-time syntax validators for SHACL TTL shapes and SPARQL fragments.
/// <br/><br/>
/// <strong>Why validate at registration time?</strong>
/// The SDK's <c>ShapeCache</c> parses TTL lazily — on first enforcement, not at registration.
/// A typo in a SHACL shape or SPARQL fragment silently registers, then fails at runtime
/// with a cryptic parse error deep in the request pipeline. By validating syntax eagerly,
/// we catch malformed aspects the moment they're registered — fast fail, clear message.
/// </summary>
public static class AspectValidation
{
    /// <summary>
    /// Validates that <paramref name="ttl"/> is syntactically valid Turtle.
    /// Throws <see cref="ArgumentException"/> with the parse error details if invalid.
    /// Returns silently if <paramref name="ttl"/> is null or whitespace.
    /// </summary>
    public static void ValidateTtl(string? ttl, string aspectIri)
    {
        if (string.IsNullOrWhiteSpace(ttl))
            return;

        try
        {
            var graph = new Graph();
            var parser = new TurtleParser();
            using var reader = new StringReader(ttl);
            parser.Load(graph, reader);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(
                $"Aspect '{aspectIri}' contains invalid Turtle/SHACL syntax. " +
                $"Parse error: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Validates that <paramref name="sparqlFragment"/> is valid SPARQL WHERE-body syntax.
    /// Wraps the fragment in <c>SELECT * WHERE { ... }</c> and parses it as a SPARQL query.
    /// Throws <see cref="ArgumentException"/> if invalid.
    /// Returns silently if <paramref name="sparqlFragment"/> is null or whitespace.
    /// </summary>
    public static void ValidateSparql(string? sparqlFragment, string aspectIri)
    {
        if (string.IsNullOrWhiteSpace(sparqlFragment))
            return;

        try
        {
            var fullQuery = $"SELECT * WHERE {{ {sparqlFragment} }}";
            var parser = new SparqlQueryParser();
            parser.ParseFromString(fullQuery);
        }
        catch (Exception ex)
        {
            throw new ArgumentException(
                $"Aspect '{aspectIri}' contains invalid SPARQL syntax in its WHERE fragment. " +
                $"Parse error: {ex.Message}", ex);
        }
    }
}
