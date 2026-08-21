using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Room — a rentable room within a <see cref="Property"/>.
/// Inherits <see cref="Segmentation"/> and carries furnishing and status metadata.
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
}
