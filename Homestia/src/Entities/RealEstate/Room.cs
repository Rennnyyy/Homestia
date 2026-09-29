using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Room — a rentable room within a <see cref="Property"/>.
/// Inherits <see cref="Segmentation"/> and carries furnishing and status metadata
/// plus a collection of <see cref="InventoryItem"/>s.
/// </summary>
[Label("Room")]
[Label("de", "Zimmer")]
[Entity(PredicatePath = "room")]
[OperationEndpoints("rooms")]
public partial class Room : Segmentation
{
    /// <summary>The room's area in square metres; optional (no size until provided).</summary>
    [Label("Room Size")]
    [Label("de", "Zimmergröße")]
    [Predicate("roomSize")]
    public decimal? RoomSize { get; set; }

    [Label("Location")]
    [Label("de", "Lage")]
    [Predicate("location")]
    public string Location { get; set; } = string.Empty;

    /// <summary>How furnished the room is.</summary>
    [Label("Furnishing Status")]
    [Label("de", "Einrichtungsstatus")]
    [Owning("furnishingStatus")]
    public partial EntityRef<FurnishingStatus>? FurnishingStatus { get; set; }

    /// <summary>Current rental lifecycle status.</summary>
    [Label("Room Status")]
    [Label("de", "Zimmerstatus")]
    [Owning("roomStatus")]
    public partial EntityRef<RoomStatus>? RoomStatus { get; set; }

    /// <summary>Inventory items equipped in this room.</summary>
    [Label("Inventory")]
    [Label("de", "Inventar")]
    [Owning("equippedWith")]
    public partial EntityRefCollection<InventoryItem> Inventory { get; }
}
