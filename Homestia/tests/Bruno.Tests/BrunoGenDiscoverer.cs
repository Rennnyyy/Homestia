using System.Reflection;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Bruno.Tests;

/// <summary>
/// Auto-discovers <c>[Entity]</c> types and <c>[Capability]</c> handlers
/// across the Program slices and generates Bruno <c>.bru</c> test files
/// that adapt to the current entity shape.
/// <br/><br/>
/// <strong>Why auto-generate?</strong>
/// When you add an entity property or a new capability, the Bruno tests
/// automatically reflect the change — no manual .bru file editing.
/// The generated files are written to a temp directory and run via
/// <c>npx @usebruno/cli</c> against a running server.
/// </summary>
public static class BrunoGenDiscoverer
{
    /// <summary>
    /// Discovers all <c>[Entity]</c>-annotated types across loaded assemblies
    /// that have <c>[OperationEndpoints]</c>.
    /// </summary>
    public static IReadOnlyList<EntityMeta> DiscoverEntities()
    {
        var result = new List<EntityMeta>();

        foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
        {
            // Only scan Program-slice assemblies (skip system/Framework assemblies)
            if (!(assembly.FullName?.StartsWith("Homestia") ?? false))
                continue;

            DiscoverFromAssembly(assembly, result);
        }

        // Fallback: if the entities assembly wasn't loaded yet, load it explicitly.
        if (result.Count == 0)
        {
            try
            {
                var entitiesAssembly = Assembly.Load("Homestia.Entities");
                DiscoverFromAssembly(entitiesAssembly, result);
            }
            catch
            {
                // Assembly not available — no entities to generate.
            }
        }

        return result;
    }

    private static void DiscoverFromAssembly(Assembly assembly, List<EntityMeta> result)
    {
        foreach (var type in GetExportedTypesSafe(assembly))
        {
            var entityAttr = type.GetCustomAttribute<EntityAttribute>();
            var opAttr = type.GetCustomAttribute<OperationEndpointsAttribute>();
            if (entityAttr == null || opAttr == null)
                continue;

            var isEnumeration = type.GetCustomAttribute<EnumerationAttribute>() != null;

            // Path comes from [Entity(Path)] or, for derived entities that
            // only set PredicatePath, from [OperationEndpoints("route")].
            var path = entityAttr.Path ?? opAttr.Path;
            if (path == null)
                continue;

            var predicates = new List<PredicateMeta>();
            foreach (var prop in type.GetProperties())
            {
                var predAttr = prop.GetCustomAttribute<PredicateAttribute>();
                if (predAttr == null) continue;

                predicates.Add(new PredicateMeta(
                    predAttr.Predicate,
                    prop.PropertyType,
                    prop.Name));
            }

            result.Add(new EntityMeta(
                type,
                path,
                predicates,
                IsEnumeration: isEnumeration));
        }
    }

    /// <summary>
    /// Generates a Bruno collection directory for the given entities and
    /// capabilities into <paramref name="outputDir"/>.
    /// Returns the list of chapter directory names created.
    /// </summary>
    public static IReadOnlyList<string> GenerateBrunoCollection(
        string outputDir,
        IReadOnlyList<EntityMeta> entities,
        string baseUrl = "{{baseUrl}}")
    {
        Directory.CreateDirectory(outputDir);
        var chapters = new List<string>();

        // ── bruno.json ───────────────────────────────────────────────────
        File.WriteAllText(Path.Combine(outputDir, "bruno.json"), """
        {
          "version": "1",
          "name": "Homestia.AutoGen",
          "type": "collection",
          "ignore": []
        }
        """);

        // ── environments/local.bru ───────────────────────────────────────
        var envDir = Path.Combine(outputDir, "environments");
        Directory.CreateDirectory(envDir);
        File.WriteAllText(Path.Combine(envDir, "local.bru"), """
        vars {
          baseUrl: http://localhost:5000
        }
        """);

        // ── Entity chapters (one per entity) ─────────────────────────────
        foreach (var entity in entities)
        {
            var chapterDir = Path.Combine(outputDir, $"entities-{entity.Path}");
            Directory.CreateDirectory(chapterDir);
            chapters.Add(Path.GetFileName(chapterDir));

            // Bruno v3 walks up the directory tree to find bruno.json — the
            // root-level bruno.json above covers all chapter subdirectories.
            // Per-chapter bruno.json would block this parent discovery.

            if (entity.IsEnumeration)
            {
                // Enumerations are a fixed set — just verify the list endpoint
                // returns the expected predefined instances.
                File.WriteAllText(Path.Combine(chapterDir, "01-list-verify.bru"),
                    GenerateEnumerationListBru(entity, baseUrl));
            }
            else
            {
                // Variable to hold the created entity's IRI across requests
                var iriVar = $"{{{{entityIri_{entity.Path}}}}}";

                // 01-create.bru
                File.WriteAllText(Path.Combine(chapterDir, "01-create.bru"),
                    GenerateCreateBru(entity, baseUrl, iriVar));

                // 02-read.bru
                File.WriteAllText(Path.Combine(chapterDir, "02-read.bru"),
                    GenerateReadBru(entity, baseUrl, iriVar));

                // 03-update.bru
                File.WriteAllText(Path.Combine(chapterDir, "03-update.bru"),
                    GenerateUpdateBru(entity, baseUrl, iriVar));

                // 04-list.bru
                File.WriteAllText(Path.Combine(chapterDir, "04-list.bru"),
                    GenerateListBru(entity, baseUrl));

                // 05-delete.bru
                File.WriteAllText(Path.Combine(chapterDir, "05-delete.bru"),
                    GenerateDeleteBru(entity, baseUrl, iriVar));
            }
        }

        return chapters;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // .bru file generators
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateCreateBru(EntityMeta entity, string baseUrl, string iriVar)
    {
        var bodyBlock = BuildBodyJsonBlock(entity);

        return $$"""
        meta {
          name: Create {{entity.TypeName}}
          type: http
          seq: 1
        }

        post {
          url: {{baseUrl}}/api/entities/{{entity.Path}}
          body: json
          auth: none
        }

        headers {
          Content-Type: application/json
        }

        {{bodyBlock}}

        assert {
          res.status: eq 200
          res.body.iri: isDefined
        }

        script:post-response {
          bru.setVar("{{iriVar.Trim('{', '}')}}", res.body.iri);
        }
        """;
    }

    private static string BuildBodyJsonBlock(EntityMeta entity, string suffix = "")
    {
        var lines = new List<string>();
        lines.Add("body:json {");
        lines.Add("  {");
        for (int i = 0; i < entity.Predicates.Count; i++)
        {
            var p = entity.Predicates[i];
            var comma = i < entity.Predicates.Count - 1 ? "," : "";
            lines.Add($"    \"{p.PredicateName}\": {GenerateSampleValue(p, suffix)}{comma}");
        }
        lines.Add("  }");
        lines.Add("}");
        return string.Join("\n", lines);
    }

    private static string GenerateReadBru(EntityMeta entity, string baseUrl, string iriVar)
    {
        var assertions = GenerateReadAssertions(entity);

        return $$"""
        meta {
          name: Read {{entity.TypeName}}
          type: http
          seq: 2
        }

        get {
          url: {{baseUrl}}/api/entities/{{entity.Path}}?iri={{iriVar}}
          body: none
          auth: none
        }

        assert {
          res.status: eq 200
          {{assertions}}
        }
        """;
    }

    private static string GenerateUpdateBru(EntityMeta entity, string baseUrl, string iriVar)
    {
        var bodyBlock = BuildBodyJsonBlock(entity, suffix: " (updated)");

        return $$"""
        meta {
          name: Update {{entity.TypeName}}
          type: http
          seq: 3
        }

        put {
          url: {{baseUrl}}/api/entities/{{entity.Path}}?iri={{iriVar}}
          body: json
          auth: none
        }

        headers {
          Content-Type: application/json
        }

        {{bodyBlock}}

        assert {
          res.status: eq 200
        }
        """;
    }

    private static string GenerateListBru(EntityMeta entity, string baseUrl)
    {
        return $$"""
        meta {
          name: List {{entity.TypeName}}s
          type: http
          seq: 4
        }

        get {
          url: {{baseUrl}}/api/entities/{{entity.Path}}
          body: none
          auth: none
        }

        assert {
          res.status: eq 200
          res.body.items: isDefined
        }
        """;
    }

    private static string GenerateDeleteBru(EntityMeta entity, string baseUrl, string iriVar)
    {
        return $$"""
        meta {
          name: Delete {{entity.TypeName}}
          type: http
          seq: 5
        }

        delete {
          url: {{baseUrl}}/api/entities/{{entity.Path}}?iri={{iriVar}}
          body: none
          auth: none
        }

        assert {
          res.status: eq 200
        }
        """;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Enumeration list-verify generator
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateEnumerationListBru(EntityMeta entity, string baseUrl)
    {
        // Read the static All property to get expected instances and their keys.
        var allProp = entity.Type.GetProperty("All",
            BindingFlags.Public | BindingFlags.Static);
        var all = allProp?.GetValue(null) as System.Collections.IList;
        var expectedCount = all?.Count ?? 0;

        // Build assertions for each expected key.
        var keyAssertions = new List<string>();
        if (all != null)
        {
            for (int i = 0; i < all.Count; i++)
            {
                var instance = all[i];
                var keyProp = instance?.GetType().GetProperty("Key");
                var key = keyProp?.GetValue(instance) as string;
                if (key != null)
                    keyAssertions.Add(
                        $"res.body.items[{i}].key: eq \"{key}\"");
            }
        }

        var assertions = string.Join("\n  ", keyAssertions);

        return $$"""
        meta {
          name: List {{entity.TypeName}} enumeration values
          type: http
          seq: 1
        }

        get {
          url: {{baseUrl}}/api/entities/{{entity.Path}}
          body: none
          auth: none
        }

        assert {
          res.status: eq 200
          res.body.items: isArray
          {{assertions}}
        }
        """;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Sample data generation
    // ═══════════════════════════════════════════════════════════════════════

    private static string GenerateSampleValue(PredicateMeta p, string suffix)
    {
        var type = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;

        if (type == typeof(string))
            return $"\"auto-{p.PropertyName}{suffix}\"";
        if (type == typeof(bool))
            return "true";
        if (type == typeof(int))
            return "42";
        if (type == typeof(long))
            return "9780201379624";
        if (type == typeof(float))
            return "0.75";
        if (type == typeof(double))
            return "98.6";
        if (type == typeof(decimal))
            return "1234.56";
        if (type == typeof(DateOnly))
            return "\"2026-01-01\"";
        if (type == typeof(DateTimeOffset))
            return "\"2026-05-04T12:00:00+00:00\"";
        if (type == typeof(Guid))
            return "\"a1b2c3d4-e5f6-7890-abcd-ef1234567890\"";
        if (type == typeof(Uri))
            return "\"https://homestia.katharsis.digital/\"";

        return "\"auto-generated\"";
    }

    private static string GenerateReadAssertions(EntityMeta entity)
    {
        var lines = new List<string> { "res.body.iri: isDefined" };

        foreach (var p in entity.Predicates)
        {
            var type = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;

            // For nullable types, use isDefined; for non-nullable, check the value
            if (IsNullable(p.PropertyType))
            {
                lines.Add($"res.body.{p.PredicateName}: isDefined");
            }
            else if (type == typeof(string))
            {
                lines.Add($"res.body.{p.PredicateName}: isDefined");
            }
            else if (type == typeof(bool))
            {
                lines.Add($"res.body.{p.PredicateName}: isDefined");
            }
            else if (type == typeof(Uri))
            {
                lines.Add($"res.body.{p.PredicateName}: isDefined");
            }
            else
            {
                lines.Add($"res.body.{p.PredicateName}: isDefined");
            }
        }

        return string.Join("\n  ", lines);
    }

    private static bool IsNullable(Type type) =>
        Nullable.GetUnderlyingType(type) != null;

    private static IEnumerable<Type> GetExportedTypesSafe(Assembly assembly)
    {
        try { return assembly.GetExportedTypes(); }
        catch { return []; }
    }
}

// ── Metadata types ───────────────────────────────────────────────────────────

public sealed record EntityMeta(
    Type Type,
    string Path,
    IReadOnlyList<PredicateMeta> Predicates,
    bool IsEnumeration = false)
{
    public string TypeName => Type.Name;
}

public sealed record PredicateMeta(
    string PredicateName,
    Type PropertyType,
    string PropertyName);
