using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// RentalAgreement — the rental contract between a <see cref="Tenant"/> and the
/// landlord, covering one or more <see cref="Segmentation"/>s.
/// </summary>
[Entity(Path = "rental-agreements", PredicatePath = "rentalAgreement")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class RentalAgreement
{
    [Predicate("start")]
    public DateTime Start { get; set; }

    [Predicate("end")]
    public DateTime? End { get; set; }

    [Predicate("createdAt")]
    public DateTime CreatedAt { get; set; }

    [Predicate("terminatedAt")]
    public DateTime? TerminatedAt { get; set; }

    [Predicate("closedAt")]
    public DateTime? ClosedAt { get; set; }

    /// <summary>The tenant who rents this agreement.</summary>
    [Owning("rentedBy")]
    public partial EntityRef<Tenant>? Tenant { get; set; }

    /// <summary>Documents attached to this agreement.</summary>
    [Owning("hasAttachments")]
    public partial EntityRefCollection<RentalAgreementDocument> Attachments { get; }

    /// <summary>Segmentations whose usage is included in this agreement.</summary>
    [Owning("includesUsageOf")]
    public partial EntityRefCollection<Segmentation> Segmentations { get; }

    /// <summary>Lifecycle status of the agreement.</summary>
    [Owning("hasStatus")]
    public partial EntityRef<RentalAgreementStatus>? Status { get; set; }
}
