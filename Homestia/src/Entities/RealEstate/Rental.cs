using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Rental — a rental agreement between a <see cref="Tenant"/> and a
/// <see cref="Landlord"/> for a <see cref="Property"/> (or a single
/// <see cref="Room"/> unit). The agreement progresses through the
/// <see cref="RentalStage"/> lifecycle; each stage's fields are grouped below
/// and validated by their own view aspect in <c>ViewAspects.cs</c>.
/// </summary>
[Entity(Path = "rentals", PredicatePath = "rental")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Rental
{
    /// <summary>Current lifecycle stage — advanced as each stage's view validates.</summary>
    [Owning("currentStage")]
    public partial EntityRef<RentalStage>? CurrentStage { get; set; }

    // ── Stage 1 · Application ───────────────────────────────────────────────

    /// <summary>When the tenant applied.</summary>
    [Predicate("applicationDate")]
    public string ApplicationDate { get; set; } = string.Empty;

    /// <summary>The tenant who rents under this agreement.</summary>
    [Owning("tenant")]
    public partial EntityRef<Tenant>? Tenant { get; set; }

    // ── Stage 2 · Contract ──────────────────────────────────────────────────

    /// <summary>The rented property.</summary>
    [Owning("property")]
    public partial EntityRef<Property>? Property { get; set; }

    /// <summary>The specific room, for single-room (shared living) rentals.</summary>
    [Owning("unit")]
    public partial EntityRef<Room>? Unit { get; set; }

    /// <summary>Monthly rent in euros.</summary>
    [Predicate("rent")]
    public decimal Rent { get; set; }

    /// <summary>Rental start date.</summary>
    [Predicate("startDate")]
    public string StartDate { get; set; } = string.Empty;

    /// <summary>Contract duration in months.</summary>
    [Predicate("durationMonths")]
    public int DurationMonths { get; set; }

    // ── Stage 3 · Deposit ───────────────────────────────────────────────────

    /// <summary>Deposit amount in euros.</summary>
    [Predicate("depositAmount")]
    public decimal DepositAmount { get; set; }

    /// <summary>Whether the deposit has been paid.</summary>
    [Predicate("depositPaid")]
    public bool DepositPaid { get; set; }

    /// <summary>When the deposit was paid.</summary>
    [Predicate("depositPaymentDate")]
    public string DepositPaymentDate { get; set; } = string.Empty;

    // ── Stage 4 · Handover ──────────────────────────────────────────────────

    /// <summary>Keys/property handover date.</summary>
    [Predicate("handoverDate")]
    public string HandoverDate { get; set; } = string.Empty;

    /// <summary>Handover protocol notes.</summary>
    [Predicate("handoverNotes")]
    public string HandoverNotes { get; set; } = string.Empty;

    // ── Stage 5 · Tenancy ───────────────────────────────────────────────────

    /// <summary>Confirms the tenancy is active (resting state of the agreement).</summary>
    [Predicate("tenancyActive")]
    public bool TenancyActive { get; set; }

    // ── Stage 6 · Termination Noticed ───────────────────────────────────────

    /// <summary>When the termination notice was given.</summary>
    [Predicate("noticeDate")]
    public string NoticeDate { get; set; } = string.Empty;

    /// <summary>Termination reason.</summary>
    [Predicate("noticeReason")]
    public string NoticeReason { get; set; } = string.Empty;

    // ── Stage 7 · Handback ──────────────────────────────────────────────────

    /// <summary>Keys/property handback date.</summary>
    [Predicate("handbackDate")]
    public string HandbackDate { get; set; } = string.Empty;

    /// <summary>Handback protocol notes.</summary>
    [Predicate("handbackNotes")]
    public string HandbackNotes { get; set; } = string.Empty;

    /// <summary>Whether damage was confirmed at handback.</summary>
    [Predicate("damageConfirmed")]
    public bool DamageConfirmed { get; set; }

    // ── Stage 8 · Terminated ────────────────────────────────────────────────

    /// <summary>Final financial settlement date.</summary>
    [Predicate("settlementDate")]
    public string SettlementDate { get; set; } = string.Empty;

    /// <summary>Whether the deposit was returned.</summary>
    [Predicate("depositReturned")]
    public bool DepositReturned { get; set; }

    /// <summary>Final settlement notes.</summary>
    [Predicate("settlementNotes")]
    public string SettlementNotes { get; set; } = string.Empty;
}
