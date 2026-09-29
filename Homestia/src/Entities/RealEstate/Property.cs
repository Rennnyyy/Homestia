using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Property — a real-estate property owned by a <see cref="Landlord"/>.
/// Inherits <see cref="Segmentation"/> and acts as the composite root for its
/// child <see cref="Room"/> and <see cref="CommonArea"/> segmentations.
/// </summary>
[Label("Property")]
[Label("de", "Objekt")]
[Entity(PredicatePath = "property")]
[OperationEndpoints("properties")]
public partial class Property : Segmentation
{
    [Label("Address")]
    [Label("de", "Adresse")]
    [Predicate("address")]
    public string Address { get; set; } = string.Empty;

    [Label("Property Type")]
    [Label("de", "Objekttyp")]
    [Owning("propertyType")]
    public partial EntityRef<PropertyType>? PropertyType { get; set; }

    [Label("Rental Model")]
    [Label("de", "Mietmodell")]
    [Owning("rentalModel")]
    public partial EntityRef<RentalModel>? RentalModel { get; set; }

    /// <summary>
    /// Inverse: auto-computed from Segmentation.IsPartOf — all segmentations in
    /// this property. The predicate local is <c>segmentedInto</c>, not the
    /// owning <c>isPartOf</c>: Property inherits the owning predicate from
    /// Segmentation, and two predicate locals that PascalCase to the same
    /// vocabulary member are a build error (ALETHEIA_0010). The owning side
    /// keeps the graph predicate; the inverse is read-only and never persisted.
    /// </summary>
    [Label("Rooms")]
    [Label("de", "Räume")]
    [Inverse("IsPartOf", "segmentedInto")]
    public partial EntityRefCollection<Segmentation> SegmentedInto { get; }
}
