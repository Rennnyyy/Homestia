using System.Diagnostics;
using System.Net;
using System.Net.Sockets;

namespace Aletheia.Sdk.Program.Bruno.Tests;

/// <summary>
/// xUnit collection fixture that manages the Program server subprocess
/// lifecycle for Bruno integration tests.
/// </summary>
[CollectionDefinition("BrunoGen")]
public sealed class BrunoGenCollection : ICollectionFixture<BrunoGenFixture>;

public class BrunoGenFixture : IAsyncLifetime
{
    private Process? _serverProcess;
    private int _serverPort;

    public bool NpxAvailable { get; private set; }
    public string BaseUrl => $"http://localhost:{_serverPort}";
    public string BrunoOutputDir { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        NpxAvailable = await ProbeNpxAsync();
    }

    public async Task DisposeAsync()
    {
        await StopServerAsync();
    }

    // ── Server lifecycle ────────────────────────────────────────────────────

    public async Task StartServerAsync()
    {
        _serverPort = GetFreePort();

        var dllPath = FindServerDll();
        var contentRoot = FindContentRoot();

        var psi = new ProcessStartInfo("dotnet", $"exec \"{dllPath}\"")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
        };
        psi.Environment["ASPNETCORE_URLS"] = BaseUrl;
        psi.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
        psi.Environment["ASPNETCORE_CONTENTROOT"] = contentRoot;

        _serverProcess = new Process { StartInfo = psi };
        _serverProcess.Start();

        await WaitForServerReadyAsync(TimeSpan.FromSeconds(30));
    }

    public async Task StopServerAsync()
    {
        if (_serverProcess is { HasExited: false })
        {
            _serverProcess.Kill(entireProcessTree: true);
            await _serverProcess.WaitForExitAsync();
            _serverProcess.Dispose();
            _serverProcess = null;
        }
    }

    // ── Bruno generation and execution ──────────────────────────────────────

    public IReadOnlyList<string> GenerateAndGetChapters()
    {
        BrunoOutputDir = Path.Combine(Path.GetTempPath(), $"bruno-gen-{Guid.NewGuid():N}");
        var entities = BrunoGenDiscoverer.DiscoverEntities();

        var chapters = BrunoGenDiscoverer.GenerateBrunoCollection(
            BrunoOutputDir, entities, BaseUrl);

        return chapters;
    }

    public async Task<int> RunBrunoChapterAsync(string chapter)
    {
        var chapterPath = Path.Combine(BrunoOutputDir, chapter);

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

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static string FindServerDll()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Aletheia.Sdk.Program.dll"),
            // Fallback: look in the Program project's build output
            Path.Combine(
                AppContext.BaseDirectory,
                "..", "..", "..", "..", "..",
                "src", "Program", "bin", "Debug", "net10.0", "Aletheia.Sdk.Program.dll"),
        };

        foreach (var path in candidates)
        {
            if (File.Exists(path))
                return Path.GetFullPath(path);
        }

        throw new FileNotFoundException(
            $"Could not find Aletheia.Sdk.Program.dll. Searched: {string.Join(", ", candidates)}");
    }

    private static string FindContentRoot()
    {
        // The Program project root (where appsettings.json lives)
        var candidate = Path.Combine(
            AppContext.BaseDirectory,
            "..", "..", "..", "..", "..",
            "src", "Program");

        if (Directory.Exists(candidate))
            return Path.GetFullPath(candidate);

        return AppContext.BaseDirectory;
    }

    private static int GetFreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private async Task WaitForServerReadyAsync(TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);
        using var client = new HttpClient();

        while (!cts.IsCancellationRequested)
        {
            try
            {
                var response = await client.GetAsync(
                    $"{BaseUrl}/api/entities/data-records", cts.Token);
                if (response.StatusCode is HttpStatusCode.OK or HttpStatusCode.NotFound)
                    return;
            }
            catch
            {
                // Server not ready yet
            }

            await Task.Delay(500, cts.Token);
        }

        throw new TimeoutException($"Server did not start within {timeout.TotalSeconds}s");
    }

    private static async Task<bool> ProbeNpxAsync()
    {
        try
        {
            using var proc = new Process();
            proc.StartInfo = new ProcessStartInfo("npx", "--version")
            {
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            proc.Start();
            await proc.WaitForExitAsync();
            return proc.ExitCode == 0;
        }
        catch
        {
            return false;
        }
    }
}
