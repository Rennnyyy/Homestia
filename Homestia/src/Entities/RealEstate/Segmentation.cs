using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Segmentation — abstract base for any spatially-defined part of a property.
/// <see cref="Property"/> and <see cref="Room"/> derive from this base, sharing a
/// common identity space and the <c>Name</c> property.
/// </summary>
[Entity(Path = "segmentations")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Segmentation
{
    [Predicate("name")]
    public string Name { get; set; } = string.Empty;

    [Predicate("isCommonArea")]
    public bool IsCommonArea { get; set; }

    /// <summary>Owning: the property this segmentation belongs to.</summary>
    [Owning("isPartOf")]
    public partial EntityRef<Property>? IsPartOf { get; set; }

    /// <summary>Agreements that include this segmentation — inverse of <see cref="RentalAgreement.Segmentations"/>.</summary>
    [Inverse("Segmentations", "includesUsageOf")]
    public partial EntityRefCollection<RentalAgreement> RentalAgreements { get; }
}
