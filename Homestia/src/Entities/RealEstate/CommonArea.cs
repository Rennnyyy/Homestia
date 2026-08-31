using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// CommonArea — a shared space within a <see cref="Property"/> (kitchen, hallway, lounge, etc.).
/// Inherits <see cref="Segmentation"/> and carries a collection of <see cref="InventoryItem"/>s.
/// </summary>
[Entity(PredicatePath = "commonArea")]
[OperationEndpoints("common-areas")]
public partial class CommonArea : Segmentation
{
    /// <summary>Inventory items equipped in this common area.</summary>
    [Owning("equippedWith")]
    public partial EntityRefCollection<InventoryItem> Inventory { get; }
}
