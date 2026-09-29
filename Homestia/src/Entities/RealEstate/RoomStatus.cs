using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// RoomStatus — enumeration of a room's rental lifecycle state.
/// Fixed set: Available (default), Reserved, ActivelyRented, Blocked.
/// </summary>
[Label("Room Status")]
[Label("de", "Zimmerstatus")]
[Entity(Path = "room-statuses", PredicatePath = "roomStatus")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RoomStatus
{
    [Label("Key")]
    [Label("de", "Schlüssel")]
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Label("Display name")]
    [Label("de", "Anzeigename")]
    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [Label("Available")]
    [Label("de", "Verfügbar")]
    public static readonly RoomStatus Available      = new() { Key = "available", DisplayName = "Available" };
    [Label("Reserved")]
    [Label("de", "Reserviert")]
    public static readonly RoomStatus Reserved       = new() { Key = "reserved", DisplayName = "Reserved" };
    [Label("Actively Rented")]
    [Label("de", "Aktiv vermietet")]
    public static readonly RoomStatus ActivelyRented = new() { Key = "actively-rented", DisplayName = "Actively Rented" };
    [Label("Blocked")]
    [Label("de", "Gesperrt")]
    public static readonly RoomStatus Blocked        = new() { Key = "blocked", DisplayName = "Blocked" };

    public static IReadOnlyList<RoomStatus> All { get; } = [Available, Reserved, ActivelyRented, Blocked];
}
