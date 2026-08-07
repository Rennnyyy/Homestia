using System.Diagnostics;
using Aletheia.Sdk.Testing;

namespace Aletheia.Sdk.Program.Bruno.Tests;

/// <summary>
/// xUnit collection fixture that inherits the battle-tested server lifecycle
/// from <see cref="BrunoFixture"/> and adds on-the-fly Bruno .bru chapter
/// generation for all discovered <c>[Entity]</c> + <c>[OperationEndpoints]</c> types.
/// </summary>
[CollectionDefinition("BrunoGen")]
public sealed class BrunoGenCollection : ICollectionFixture<BrunoGenFixture>;

public class BrunoGenFixture : BrunoFixture
{
    public BrunoGenFixture() : base("Aletheia.Sdk.Program.dll") { }

    /// <summary>Shared across the temporary [MemberData] fixture and the injected test fixture.</summary>
    private static string? s_brunoOutputDir;
    private static IReadOnlyList<string> s_chapters = Array.Empty<string>();

    public string BrunoOutputDir => s_brunoOutputDir ?? string.Empty;

    // ── Bruno chapter auto-generation ───────────────────────────────────────

    public static IReadOnlyList<string> GenerateAndGetChapters()
    {
        s_brunoOutputDir = AppContext.BaseDirectory;

        // Clean stale generated chapters from previous runs.
        if (Directory.Exists(s_brunoOutputDir))
        {
            foreach (var dir in Directory.GetDirectories(s_brunoOutputDir, "entities-*"))
                Directory.Delete(dir, recursive: true);
        }

        var entities = BrunoGenDiscoverer.DiscoverEntities();

        s_chapters = BrunoGenDiscoverer.GenerateBrunoCollection(
            s_brunoOutputDir, entities, "{{baseUrl}}");

        return s_chapters;
    }

    public async Task<int> RunGeneratedChapterAsync(string chapter)
    {
        var chapterPath = Path.Combine(s_brunoOutputDir!, chapter);

        using var proc = new Process();
        proc.StartInfo = new ProcessStartInfo(
            "npx", $"@usebruno/cli run \"{chapterPath}\" --env local --env-var baseUrl={BaseUrl}")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        proc.Start();
        await proc.WaitForExitAsync();
        return proc.ExitCode;
    }
}
