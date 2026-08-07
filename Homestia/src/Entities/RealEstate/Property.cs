using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Property — a real-estate property owned by a <see cref="Landlord"/>.
/// Inherits <see cref="Segmentation"/> (every property is a segmentable space) and
/// acts as the composite root for its child <see cref="Room"/> and <see cref="CommonArea"/>
/// segmentations.
/// </summary>
[Entity(PredicatePath = "property")]
[OperationEndpoints("properties")]
public partial class Property : Segmentation
{
    [Predicate("address")]
    public string Address { get; set; } = string.Empty;

    /// <summary>Reference to the enumeration value classifying this property.</summary>
    [Owning("propertyType")]
    public partial EntityRef<PropertyType>? PropertyType { get; set; }

    /// <summary>Reference to the rental model for this property.</summary>
    [Owning("rentalModel")]
    public partial EntityRef<RentalModel>? RentalModel { get; set; }

    /// <summary>
    /// The child segmentations (rooms and common areas) that this property is divided into.
    /// </summary>
    [Owning("segmentsInto")]
    public partial EntityRefCollection<Segmentation> Segments { get; }
}
