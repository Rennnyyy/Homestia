using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities;

/// <summary>
/// DataRecord — the canonical entity demonstrating the full Aletheia platform
/// stack. Annotated with <c>[Entity]</c> for identity, <c>[Identity]</c> for
/// auto-generated IDs, and <c>[OperationEndpoints]</c> to expose full CRUD
/// under <c>api/entities/data-records</c>.
/// </summary>
[Entity(Path = "data-records")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class DataRecord
{
    [Predicate("label")]
    public string Label { get; set; } = string.Empty;

    [Predicate("active")]
    public bool Active { get; set; }

    [Predicate("count")]
    public int Count { get; set; }

    [Predicate("serial")]
    public long Serial { get; set; }

    [Predicate("ratio")]
    public float Ratio { get; set; }

    [Predicate("score")]
    public double Score { get; set; }

    [Predicate("amount")]
    public decimal Amount { get; set; }

    [Predicate("effectiveDate")]
    public DateOnly EffectiveDate { get; set; }

    [Predicate("timestamp")]
    public DateTimeOffset Timestamp { get; set; }

    [Predicate("correlationId")]
    public Guid CorrelationId { get; set; }

    [Predicate("reference")]
    public Uri Reference { get; set; } = new Uri("https://www.aletheia.arkenforge.de/");

    // ── Nullable variants ────────────────────────────────────────────────────

    [Predicate("notes")]
    public string? Notes { get; set; }

    [Predicate("flagged")]
    public bool? Flagged { get; set; }

    [Predicate("limit")]
    public int? Limit { get; set; }

    [Predicate("sequence")]
    public long? Sequence { get; set; }

    [Predicate("factor")]
    public float? Factor { get; set; }

    [Predicate("precision")]
    public double? Precision { get; set; }

    [Predicate("fee")]
    public decimal? Fee { get; set; }

    [Predicate("expiresOn")]
    public DateOnly? ExpiresOn { get; set; }

    [Predicate("updatedAt")]
    public DateTimeOffset? UpdatedAt { get; set; }

    [Predicate("alternateId")]
    public Guid? AlternateId { get; set; }

    [Predicate("homepage")]
    public Uri? Homepage { get; set; }
}
