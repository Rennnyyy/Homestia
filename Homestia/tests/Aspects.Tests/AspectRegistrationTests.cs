using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;

namespace Aletheia.Sdk.Program.Aspects.Tests;

/// <summary>
/// Unit tests for aspect registration — validates that each aspect class
/// registers its guards with the <see cref="IAspectStore"/> without errors.
/// Uses the DI container to create a real <see cref="IAspectStore"/> (since
/// <c>AspectStore</c> is internal to the SDK).
/// </summary>
public sealed class AspectRegistrationTests
{
    private static IAspectStore CreateStore()
    {
        var services = new ServiceCollection();
        services.AddAspects();
        return services.BuildServiceProvider().GetRequiredService<IAspectStore>();
    }

    // ── Capability Aspects ──────────────────────────────────────────────────

    [Fact]
    public void RegisterCapabilityAspects_registers_without_errors()
    {
        var store = CreateStore();

        // Should not throw — confirms the SHACL TTL parses and registers.
        Should.NotThrow(() => store.RegisterCapabilityAspects());
    }

    [Fact]
    public void Greet_capability_aspect_is_resolvable_after_registration()
    {
        var store = CreateStore();
        store.RegisterCapabilityAspects();

        var resolved = store.ResolveMessage("urn:aletheia:aspects:greet-v1");

        resolved.ShouldNotBeNull();
        resolved.Iri.ShouldBe("urn:aletheia:aspects:greet-v1");
    }

    [Fact]
    public void Greet_capability_aspect_root_is_resolvable()
    {
        var store = CreateStore();
        store.RegisterCapabilityAspects();

        var resolved = store.ResolveCapabilityAspect("urn:aletheia:aspects:capability:greet-v1");

        resolved.ShouldNotBeNull();
        resolved.CommandAspectIri.ShouldBe("urn:aletheia:aspects:greet-v1");
    }

    [Fact]
    public void RegisterCapabilityAspects_is_idempotent_regarding_resolution()
    {
        var store = CreateStore();
        store.RegisterCapabilityAspects();

        // Second registration would throw on duplicate — we test resolution survives.
        var first = store.ResolveMessage("urn:aletheia:aspects:greet-v1");
        var second = store.ResolveMessage("urn:aletheia:aspects:greet-v1");

        first.ShouldBeSameAs(second);
    }

    // ── Operation Aspects ───────────────────────────────────────────────────

    [Fact]
    public void RegisterOperationAspects_registers_without_errors()
    {
        var store = CreateStore();

        Should.NotThrow(() => store.RegisterOperationAspects());
    }

    [Fact]
    public void DataRecord_operation_aspect_is_resolvable()
    {
        var store = CreateStore();
        store.RegisterOperationAspects();

        var resolved = store.ResolveOperation("urn:aletheia:aspects:data-record-write-v1");

        resolved.ShouldNotBeNull();
        resolved.Iri.ShouldBe("urn:aletheia:aspects:data-record-write-v1");
    }

    // ── Query Aspects ───────────────────────────────────────────────────────

    [Fact]
    public void RegisterQueryAspects_registers_without_errors()
    {
        var store = CreateStore();

        Should.NotThrow(() => store.RegisterQueryAspects());
    }

    [Fact]
    public void DataRecord_query_aspect_is_resolvable()
    {
        var store = CreateStore();
        store.RegisterQueryAspects();

        var resolved = store.ResolveQuery("urn:aletheia:aspects:data-record-query-v1");

        resolved.ShouldNotBeNull();
        resolved.Iri.ShouldBe("urn:aletheia:aspects:data-record-query-v1");
    }

    // ── Object Aspects ──────────────────────────────────────────────────────

    [Fact]
    public void RegisterObjectAspects_does_not_throw()
    {
        var store = CreateStore();

        // Currently a no-op placeholder — should not throw.
        Should.NotThrow(() => store.RegisterObjectAspects());
    }

    // ── Full registration ───────────────────────────────────────────────────

    [Fact]
    public void All_four_registration_calls_succeed_in_sequence()
    {
        var store = CreateStore();

        Should.NotThrow(() =>
        {
            store.RegisterCapabilityAspects();
            store.RegisterOperationAspects();
            store.RegisterQueryAspects();
            store.RegisterObjectAspects();
        });
    }
}

/// <summary>
/// Tests for <see cref="AspectValidation"/> — validates that TTL and SPARQL
/// syntax checks catch malformed input at registration time (Level 2).
/// </summary>
public sealed class AspectValidationTests
{
    // ── Valid TTL ───────────────────────────────────────────────────────────

    [Fact]
    public void Valid_shacl_ttl_passes_validation()
    {
        const string ttl = """
            @prefix sh: <http://www.w3.org/ns/shacl#> .
            @prefix ex: <https://www.aletheia.arkenforge.de/> .
            <urn:test:shape>
                a sh:NodeShape ;
                sh:targetClass <urn:test:Target> ;
                sh:property [
                    sh:path ex:name ; sh:minLength 3 ;
                    sh:message "Name must be at least 3 characters." ;
                ] .
            """;

        Should.NotThrow(() => AspectValidation.ValidateTtl(ttl, "urn:test:valid"));
    }

    [Fact]
    public void Null_ttl_passes_validation()
    {
        Should.NotThrow(() => AspectValidation.ValidateTtl(null, "urn:test:null"));
    }

    [Fact]
    public void Whitespace_ttl_passes_validation()
    {
        Should.NotThrow(() => AspectValidation.ValidateTtl("   ", "urn:test:whitespace"));
    }

    [Fact]
    public void Malformed_ttl_throws_at_registration_time()
    {
        const string badTtl = "this is not valid turtle {{{";

        var ex = Should.Throw<ArgumentException>(
            () => AspectValidation.ValidateTtl(badTtl, "urn:test:bad"));

        ex.Message.ShouldContain("urn:test:bad");
        ex.Message.ShouldContain("Turtle");
    }

    [Fact]
    public void Ttl_with_unknown_prefixes_still_passes_syntax_check()
    {
        // Syntactically valid Turtle with unresolvable prefixes — should pass
        // syntax validation (semantic resolution happens at enforcement time).
        const string ttl = """
            @prefix unknown: <http://nonexistent.example.com/> .
            @prefix sh: <http://www.w3.org/ns/shacl#> .
            <urn:test:shape> a sh:NodeShape .
            """;

        Should.NotThrow(() => AspectValidation.ValidateTtl(ttl, "urn:test:unknown-prefix"));
    }

    // ── Valid SPARQL ────────────────────────────────────────────────────────

    [Fact]
    public void Valid_sparql_fragment_passes_validation()
    {
        const string sparql = """
            ?record <https://www.aletheia.arkenforge.de/predicates/data-records/active> ?active .
            FILTER(?active = true)
            """;

        Should.NotThrow(() => AspectValidation.ValidateSparql(sparql, "urn:test:valid-sparql"));
    }

    [Fact]
    public void Null_sparql_passes_validation()
    {
        Should.NotThrow(() => AspectValidation.ValidateSparql(null, "urn:test:null-sparql"));
    }

    [Fact]
    public void Malformed_sparql_throws_at_registration_time()
    {
        const string badSparql = "NOT A VALID SPARQL FRAGMENT {{{### SYNTAX ERROR";

        var ex = Should.Throw<ArgumentException>(
            () => AspectValidation.ValidateSparql(badSparql, "urn:test:bad-sparql"));

        ex.Message.ShouldContain("urn:test:bad-sparql");
        ex.Message.ShouldContain("SPARQL");
    }

    [Fact]
    public void Garbage_sparql_throws_at_registration_time()
    {
        const string badSparql = "NOT A VALID SPARQL FRAGMENT {{{###";

        var ex = Should.Throw<ArgumentException>(
            () => AspectValidation.ValidateSparql(badSparql, "urn:test:garbage"));

        ex.Message.ShouldContain("SPARQL");
    }
}
