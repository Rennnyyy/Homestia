using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Room — a rentable room within a <see cref="Property"/>.
/// Inherits <see cref="Segmentation"/> and carries furnishing and status metadata
/// plus a collection of <see cref="InventoryItem"/>s.
/// </summary>
[Entity(PredicatePath = "room")]
[OperationEndpoints("rooms")]
public partial class Room : Segmentation
{
    [Predicate("roomSize")]
    public decimal RoomSize { get; set; }

    [Predicate("location")]
    public string Location { get; set; } = string.Empty;

    /// <summary>How furnished the room is.</summary>
    [Owning("furnishingStatus")]
    public partial EntityRef<FurnishingStatus>? FurnishingStatus { get; set; }

    /// <summary>Current rental lifecycle status.</summary>
    [Owning("roomStatus")]
    public partial EntityRef<RoomStatus>? RoomStatus { get; set; }

    /// <summary>Inventory items equipped in this room.</summary>
    [Owning("equippedWith")]
    public partial EntityRefCollection<InventoryItem> Inventory { get; }
}
