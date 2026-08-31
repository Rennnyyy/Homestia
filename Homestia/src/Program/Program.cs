// ── Aletheia SDK — Core platform imports ────────────────────────────────────
using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;

// ── Capabilities — command/response handlers over HTTP ──────────────────────
using Aletheia.Sdk.Capability.DependencyInjection;
using Aletheia.Sdk.Capability.Http;
using Aletheia.Sdk.Capability.Http.DependencyInjection;

// ── Entities — full CRUD over REST ─────────────────────────────────────────
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations.Http;
using Aletheia.Sdk.Operations.Http.DependencyInjection;
using Aletheia.Sdk.Repository.DependencyInjection;
using Aletheia.Sdk.Repository.InMemory.DependencyInjection;
using Aletheia.Sdk.Repository.GraphDb.DependencyInjection;

// ── Object Storage — blob references via IObjectReference ──────────────────
using Aletheia.Sdk.ObjectStorage.Http;
using Aletheia.Sdk.ObjectStorage.Http.DependencyInjection;
using Aletheia.Sdk.ObjectStorage.InMemory.DependencyInjection;

// ── Authorization — role-based access control ──────────────────────────────
using Aletheia.Sdk.Authorization.DependencyInjection;
using Aletheia.Sdk.Authorization.Http.DependencyInjection;

// ── Exploration — runtime introspection ────────────────────────────────────
using Aletheia.Sdk.Aspects.Entity;
using Aletheia.Sdk.Capability.Entity;
using Aletheia.Sdk.Entity.Entity;

// ── Branching — isolation, merging, conflict detection (feature-flagged) ───
using Aletheia.Sdk.Branch.Http;
using Aletheia.Sdk.Branch.Http.DependencyInjection;

// ── Trees — hierarchical structures (feature-flagged) ──────────────────────
using Aletheia.Sdk.Structure;
using Aletheia.Sdk.Structure.DependencyInjection;

// ── Messaging — pub/sub entity events (feature-flagged) ────────────────────
using Aletheia.Sdk.Entity.Messaging.DependencyInjection;
using Aletheia.Sdk.Messaging.InMemory.DependencyInjection;
using Aletheia.Sdk.Capability.Messaging.DependencyInjection;

// ── Program slices ─────────────────────────────────────────────────────────
using Homestia.Aspects;
using Homestia.Capabilities;
using Homestia.Entities.RealEstate;

// ── AI — chat + scenario flows ─────────────────────────────────────────────
using Aletheia.Sdk.AI.DependencyInjection;
using Aletheia.Sdk.AI.Http;
using Aletheia.Sdk.AI.Scenarios;
using Homestia.AI;

// ── Web — generic entity admin (Sdk.Web) ───────────────────────────────────
using Aletheia.Sdk.Web.DependencyInjection;

// ── Web slice — Homestia facade hosting ────────────────────────────────────
using Homestia.Web;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// Angular 19+ outputs to wwwroot/browser/. Point the web root there so
// UseStaticFiles and MapFallbackToFile serve the Angular app directly —
// no flatten step needed, avoiding static web assets manifest conflicts.
// Must be set via WebApplicationOptions: .NET 10 rejects changing the web
// root through WebApplicationBuilder.WebHost settings at runtime. The path
// is owned by the Web slice (HomestiaWebPaths.WebRoot).
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = HomestiaWebPaths.WebRoot
});

// Core: Aspects are always required — they power the gatekeeper validation system.
builder.Services.AddAspects();

// Authorization (must be first — middleware runs before endpoint mapping).
builder.Services.AddRoleBasedAuthorization();
builder.Services.AddAuthorizationHttp(builder.Configuration);

// ── Feature-flagged slices ──────────────────────────────────────────────────
var features = builder.Configuration.GetSection("Aletheia:Features");
bool branching = features.GetValue<bool>("Branching");
bool trees = features.GetValue<bool>("Trees");
bool messaging = features.GetValue<bool>("Messaging");

// Branching (must precede capability registration — internal branch.merge).
if (branching)
{
    builder.Services.AddBranchHttp(builder.Configuration);
}

// Trees (must precede capability registration — internal tree capabilities).
if (trees)
{
    builder.Services.AddStructure();
}

// Capabilities — command/response handlers discovered by assembly scan.
builder.Services.AddCapabilityHandlersFromAssemblyContaining<GreetHandler>();
builder.Services.AddCapabilityHttp();

// Entities — full CRUD via [OperationEndpoints] + MapOperations().
// The backend is chosen by the `EntityRepository:Backend` configuration key.
// Deployed in the katharsis stack it is `GraphDb` (EntityRepository__Backend env);
// local dev and tests default to `InMemory` (appsettings.json).

// Per-app canonical base URL override (Entity:BaseIri). Deployed as Homestia the
// root is https://homestia.katharsis.digital (Entity__BaseIri in compose); local
// dev and tests read it from appsettings.json (Entity:BaseIri).
if (builder.Configuration["Entity:BaseIri"] is { Length: > 0 } baseIri)
    EntityOptions.BaseIri = baseIri;

var repoBuilder = builder.Services.AddEntityRepository(builder.Configuration);
if (string.Equals(builder.Configuration["EntityRepository:Backend"], "GraphDb", StringComparison.OrdinalIgnoreCase))
    repoBuilder.UseGraphDb();
else
    repoBuilder.UseInMemory();
builder.Services.AddOperationEndpointsHttpFromAssemblyContaining<Property>();

// Object storage — upload, download, delete blobs.
builder.Services.AddInMemoryObjectStorage();
builder.Services.AddObjectStorageHttpFromAssemblyContaining<Property>();

// Messaging — in-memory pub/sub for entity events.
if (messaging)
{
    builder.Services.AddMessagingInMemory();
    builder.Services.AddEntityEvents();
    builder.Services.AddCapabilityMessaging();
}

// Exploration — runtime introspection of entities, capabilities, and aspects.
builder.Services.AddAspectsEntity();
builder.Services.AddCapabilityEntity(typeof(GreetHandler).Assembly);
builder.Services.AddEntityEntity(typeof(Property).Assembly);

// AI — chat + scenario flows. Ontology and tools require the registries above.
builder.Services.AddAIOntology();
builder.Services.AddAITools();
builder.Services.AddAI(builder.Configuration);

// Web — generic entity admin at /aletheia/ (like Sdk.Sample). Serves the
// compiled Sdk.Web Angular app from its wwwroot (dedicated aletheia-wwwroot
// output folder, see RedirectSdkWebAdmin in the csproj).
builder.Services.AddWebInterface("/aletheia", ResolveSdkWebRoot());

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

var app = builder.Build();

// Authorization token middleware (must come before endpoint mapping).
app.UseAgentTokenMiddleware();

// Branch scope — isolates requests to a branch context.
if (branching)
{
    app.UseBranchScope();
}

// ── Register views ──────────────────────────────────────────────────────────
var aspectStore = app.Services.GetRequiredService<IAspectStore>();

// Frontend views — registered into the SDK's view family and served by the
// exploration endpoint api/entities/aspect-definitions/{iri}/view.
ViewAspects.RegisterViews(aspectStore);

// Query aspects — read-time enrichment (derived fields) served when a request
// opts in via the X-Aletheia-Query-AspectIri header.
QueryAspects.RegisterQueryAspects(aspectStore);

// AI scenario flows — code-defined form-filling packs (property create/edit).
AiScenarios.Register(app.Services.GetRequiredService<ScenarioRegistry>());

// ── Map endpoints ───────────────────────────────────────────────────────────

app.MapCapabilities();       // POST /api/capabilities/{name}
app.MapOperations();         // CRUD /api/entities/{path}
app.MapObjectOperations();   // /api/objects/{...}

if (branching)
{
    app.MapBranches();       // /api/branches/{...}
}

// Exploration endpoints.
app.MapEntityEntity();
app.MapCapabilityEntity();
app.MapAspectsEntity();

// AI — SSE chat and scenario-flow endpoints.
app.MapAiEndpoints();

// ── Sdk.Web — generic entity admin at /aletheia/ ─────────────────────────────
// Registered BEFORE the facade so /aletheia/* routes are not swallowed by the
// SPA fallback (which is terminal). Mirrors Sdk.Sample's wiring.
app.UseWebInterface();

// ── Web slice — serves the Angular facade + SPA fallback ────────────────────
app.UseHomestiaWeb();

app.Run();

/// <summary>
/// Locates the compiled Sdk.Web Angular admin (the "aletheia web" viewer served at
/// /aletheia/). The build redirects the Sdk.Web wwwroot into a dedicated
/// <c>aletheia-wwwroot</c> output folder so it never collides with the Homestia
/// facade (both ship browser/index.html). Resolution order:
///   1. dedicated output folder (bin + Docker publish) — <c>aletheia-wwwroot</c>
///   2. Sdk.Web default output copy (bin/wwwroot, e.g. --no-build / manual runs)
///   3. source tree — walk up to the sibling Aletheia repository
/// </summary>
static string? ResolveSdkWebRoot()
{
    // 1) Dedicated folder shipped with the build (RedirectSdkWebAdmin target).
    var dedicated = Path.Combine(AppContext.BaseDirectory, "aletheia-wwwroot");
    if (Directory.Exists(dedicated))
        return dedicated;

    // 2) Sdk.Web project's own wwwroot copied into the output directory.
    var outputWwwRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
    if (Directory.Exists(Path.Combine(outputWwwRoot, "browser")))
        return outputWwwRoot;

    // 3) Source tree — walk up from cwd/base to the sibling Aletheia repo.
    foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
    {
        var dir = new DirectoryInfo(start);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "Aletheia", "SDK", "src", "Web", "wwwroot");
            if (Directory.Exists(candidate))
                return candidate;
            dir = dir.Parent;
        }
    }

    // Let AddWebInterface fall back to its own default resolver / helpful error.
    return null;
}
