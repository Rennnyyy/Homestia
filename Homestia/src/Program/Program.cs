// ── Aletheia SDK — Core platform imports ────────────────────────────────────
using Aletheia.Sdk.Aspects.Abstractions.Contracts;
using Aletheia.Sdk.Aspects.DependencyInjection;

// ── Capabilities — command/response handlers over HTTP ──────────────────────
using Aletheia.Sdk.Capability.DependencyInjection;
using Aletheia.Sdk.Capability.Http;
using Aletheia.Sdk.Capability.Http.DependencyInjection;

// ── Entities — full CRUD over REST ─────────────────────────────────────────
using Aletheia.Sdk.Operations.Http;
using Aletheia.Sdk.Operations.Http.DependencyInjection;
using Aletheia.Sdk.Repository.DependencyInjection;
using Aletheia.Sdk.Repository.InMemory.DependencyInjection;

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
using Aletheia.Sdk.Program.Aspects;
using Aletheia.Sdk.Program.Capabilities;
using Aletheia.Sdk.Program.Entities.RealEstate;

// ── AI — chat + scenario flows ─────────────────────────────────────────────
using Aletheia.Sdk.AI.DependencyInjection;
using Aletheia.Sdk.AI.Http;
using Aletheia.Sdk.AI.Scenarios;
using Aletheia.Sdk.Program.AI;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// Angular 19+ outputs to wwwroot/browser/. Point the web root there so
// UseStaticFiles and MapFallbackToFile serve the Angular app directly —
// no flatten step needed, avoiding static web assets manifest conflicts.
// Must be set via WebApplicationOptions: .NET 10 rejects changing the web
// root through WebApplicationBuilder.WebHost settings at runtime.
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "browser")
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
var repoBuilder = builder.Services.AddEntityRepository(builder.Configuration);
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

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE PIPELINE
// ══════════════════════════════════════════════════════════════════════════════

var app = builder.Build();

// Authorization token middleware (must come before endpoint mapping).
app.UseAgentTokenMiddleware();

// ── Static files — serves the Angular facade in production ──────────────────
// Web root is set to wwwroot/browser/ so UseStaticFiles finds index.html,
// scripts, and assets directly — no flatten step needed.
app.UseStaticFiles();

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

// ── SPA fallback — serves index.html for client-side routes ──────────────────
app.MapFallbackToFile("index.html");

app.Run();
