using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Property — a real-estate property owned by a <see cref="Landlord"/>.
/// Inherits <see cref="Segmentation"/> and acts as the composite root for its
/// child <see cref="Room"/> segmentations.
/// </summary>
[Entity(PredicatePath = "property")]
[OperationEndpoints("properties")]
public partial class Property : Segmentation
{
    [Predicate("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>The landlord who owns this property.</summary>
    [Owning("ownedBy")]
    public partial EntityRef<Landlord>? OwnedBy { get; set; }

    [Owning("propertyType")]
    public partial EntityRef<PropertyType>? PropertyType { get; set; }

    [Owning("rentalModel")]
    public partial EntityRef<RentalModel>? RentalModel { get; set; }

    /// <summary>Inverse: auto-computed from Segmentation.IsPartOf — all segmentations in this property.</summary>
    [Inverse("IsPartOf", "isPartOf")]
    public partial EntityRefCollection<Segmentation> SegmentedInto { get; }
}
