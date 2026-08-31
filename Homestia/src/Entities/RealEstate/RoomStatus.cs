using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// RoomStatus — enumeration of a room's rental lifecycle state.
/// Fixed set: Available (default), Reserved, ActivelyRented, Blocked.
/// </summary>
[Entity(Path = "room-statuses", PredicatePath = "roomStatus")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RoomStatus
{
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    public static readonly RoomStatus Available      = new() { Key = "available", DisplayName = "Available" };
    public static readonly RoomStatus Reserved       = new() { Key = "reserved", DisplayName = "Reserved" };
    public static readonly RoomStatus ActivelyRented = new() { Key = "actively-rented", DisplayName = "Actively Rented" };
    public static readonly RoomStatus Blocked        = new() { Key = "blocked", DisplayName = "Blocked" };

    public static IReadOnlyList<RoomStatus> All { get; } = [Available, Reserved, ActivelyRented, Blocked];
}
