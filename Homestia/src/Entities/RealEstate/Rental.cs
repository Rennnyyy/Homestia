using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Rental — a rental agreement between a <see cref="Tenant"/> and a
/// <see cref="Landlord"/> for a <see cref="Property"/> (or a single
/// <see cref="Room"/> unit). The agreement progresses through the
/// <see cref="RentalStage"/> lifecycle; each stage's fields are grouped below
/// and validated by their own view aspect in <c>ViewAspects.cs</c>.
/// </summary>
    [Label("Rental")]
    [Label("de", "Mietverhältnis")]
[Entity(Path = "rentals", PredicatePath = "rental")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Rental
{
    /// <summary>Current lifecycle stage — advanced as each stage's view validates.</summary>
    [Label("Current Stage")]
    [Label("de", "Aktuelle Phase")]
    [Owning("currentStage")]
    public partial EntityRef<RentalStage>? CurrentStage { get; set; }

    // ── Stage 1 · Application ───────────────────────────────────────────────

    /// <summary>The rented property.</summary>
    [Label("Property")]
    [Label("de", "Objekt")]
    [Owning("property")]
    public partial EntityRef<Property>? Property { get; set; }

    /// <summary>The specific room, for single-room (shared living) rentals.</summary>
    [Label("Room")]
    [Label("de", "Zimmer")]
    [Owning("unit")]
    public partial EntityRef<Room>? Unit { get; set; }

    /// <summary>The tenant who rents under this agreement.</summary>
    [Label("Tenant")]
    [Label("de", "Mieter")]
    [Owning("tenant")]
    public partial EntityRef<Tenant>? Tenant { get; set; }

    /// <summary>When the apartment viewing takes place.</summary>
    [Label("Viewing Date")]
    [Label("de", "Besichtigungsdatum")]
    [Predicate("viewingDate")]
    public string ViewingDate { get; set; } = string.Empty;

    // ── Stage 2 · Contract ──────────────────────────────────────────────────

    /// <summary>
    /// Uploaded contract documents — each member is an object-bearing
    /// <see cref="RentalDocument"/> holding one file. At least one document is
    /// required for the Contract stage to validate.
    /// </summary>
    [Label("Rental Documents")]
    [Label("de", "Mietdokumente")]
    [Owning("rentalDocuments")]
    public partial EntityRefCollection<RentalDocument> RentalDocuments { get; }

    // ── Stage 3 · Deposit ───────────────────────────────────────────────────

    /// <summary>Deposit amount in euros.</summary>
    [Label("Deposit Amount")]
    [Label("de", "Kautionshöhe")]
    [Predicate("depositAmount")]
    public decimal DepositAmount { get; set; }

    /// <summary>Whether the deposit has been paid.</summary>
    [Label("Deposit Paid")]
    [Label("de", "Kaution bezahlt")]
    [Predicate("depositPaid")]
    public bool DepositPaid { get; set; }

    /// <summary>When the deposit was paid.</summary>
    [Label("Deposit Payment Date")]
    [Label("de", "Datum der Kautionszahlung")]
    [Predicate("depositPaymentDate")]
    public string DepositPaymentDate { get; set; } = string.Empty;

    // ── Stage 4 · Handover ──────────────────────────────────────────────────

    /// <summary>Keys/property handover date.</summary>
    [Label("Handover Date")]
    [Label("de", "Übergabedatum")]
    [Predicate("handoverDate")]
    public string HandoverDate { get; set; } = string.Empty;

    /// <summary>Handover protocol notes.</summary>
    [Label("Handover Notes")]
    [Label("de", "Übergabenotizen")]
    [Predicate("handoverNotes")]
    public string HandoverNotes { get; set; } = string.Empty;

    // ── Stage 5 · Tenancy ───────────────────────────────────────────────────

    /// <summary>Confirms the tenancy is active (resting state of the agreement).</summary>
    [Label("Tenancy Active")]
    [Label("de", "Mietverhältnis aktiv")]
    [Predicate("tenancyActive")]
    public bool TenancyActive { get; set; }

    // ── Stage 6 · Termination Noticed ───────────────────────────────────────

    /// <summary>When the termination notice was given.</summary>
    [Label("Notice Date")]
    [Label("de", "Kündigungsdatum")]
    [Predicate("noticeDate")]
    public string NoticeDate { get; set; } = string.Empty;

    /// <summary>Termination reason.</summary>
    [Label("Notice Reason")]
    [Label("de", "Kündigungsgrund")]
    [Predicate("noticeReason")]
    public string NoticeReason { get; set; } = string.Empty;

    // ── Stage 7 · Handback ──────────────────────────────────────────────────

    /// <summary>Keys/property handback date.</summary>
    [Label("Handback Date")]
    [Label("de", "Rückgabedatum")]
    [Predicate("handbackDate")]
    public string HandbackDate { get; set; } = string.Empty;

    /// <summary>Handback protocol notes.</summary>
    [Label("Handback Notes")]
    [Label("de", "Rückgabenotizen")]
    [Predicate("handbackNotes")]
    public string HandbackNotes { get; set; } = string.Empty;

    /// <summary>Whether damage was confirmed at handback.</summary>
    [Label("Damage Confirmed")]
    [Label("de", "Schaden bestätigt")]
    [Predicate("damageConfirmed")]
    public bool DamageConfirmed { get; set; }

    // ── Stage 8 · Terminated ────────────────────────────────────────────────

    /// <summary>Final financial settlement date.</summary>
    [Label("Settlement Date")]
    [Label("de", "Abrechnungsdatum")]
    [Predicate("settlementDate")]
    public string SettlementDate { get; set; } = string.Empty;

    /// <summary>Whether the deposit was returned.</summary>
    [Label("Deposit Returned")]
    [Label("de", "Kaution zurückgezahlt")]
    [Predicate("depositReturned")]
    public bool DepositReturned { get; set; }

    /// <summary>Final settlement notes.</summary>
    [Label("Settlement Notes")]
    [Label("de", "Abrechnungsnotizen")]
    [Predicate("settlementNotes")]
    public string SettlementNotes { get; set; } = string.Empty;
}
