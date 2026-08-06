using Xunit.Sdk;

namespace Aletheia.Sdk.Program.Bruno.Tests;

/// <summary>
/// Integration tests that auto-discover all <c>[Entity]</c> types with
/// <c>[OperationEndpoints]</c>, generate Bruno <c>.bru</c> files reflecting
/// the current entity shapes, and run them against a live server.
/// <br/><br/>
/// <strong>Adaptive testing:</strong> Add a property to an entity, and the
/// next test run automatically includes it in create/read/assertions.
/// No manual .bru editing needed.
/// </summary>
[Collection("BrunoGen")]
[Trait("Category", "Integration")]
[Trait("Backend", "InMemory")]
public sealed class BrunoGenTests : IAsyncLifetime
{
    private readonly BrunoGenFixture _fixture;

    public BrunoGenTests(BrunoGenFixture fixture) => _fixture = fixture;

    public async Task InitializeAsync() => await _fixture.StartServerAsync();
    public async Task DisposeAsync() => await _fixture.StopServerAsync();

    /// <summary>
    /// Auto-discovers entities, generates .bru files, and runs each chapter
    /// as a separate Bruno CLI invocation. Skips gracefully if npx is unavailable.
    /// </summary>
    [SkippableTheory]
    [MemberData(nameof(DiscoverAndGenerateChapters))]
    public async Task Bruno_auto_generated_chapter_all_pass(string chapter)
    {
        Skip.IfNot(_fixture.NpxAvailable, "Bruno CLI (npx @usebruno/cli) not available.");

        var exit = await _fixture.RunBrunoChapterAsync(chapter);
        Assert.Equal(0, exit);
    }

    public static IEnumerable<object[]> DiscoverAndGenerateChapters()
    {
        // Force-load the entity assembly so [MemberData] discovery can find them.
        _ = typeof(Aletheia.Sdk.Program.Entities.DataRecord);

        var fixture = new BrunoGenFixture();
        var chapters = fixture.GenerateAndGetChapters();

        foreach (var chapter in chapters)
            yield return new object[] { chapter };
    }
}
