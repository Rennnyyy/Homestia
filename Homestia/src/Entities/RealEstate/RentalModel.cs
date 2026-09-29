using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// RentalModel — enumeration of how a property is rented out.
/// Fixed set: EntireProperty, SingleRoomRentalSharedLiving.
/// </summary>
[Label("Rental Model")]
[Label("de", "Mietmodell")]
[Entity(Path = "rental-models", PredicatePath = "rentalModel")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RentalModel
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

    [Label("Entire Property")]
    [Label("de", "Gesamte Immobilie")]
    public static readonly RentalModel EntireProperty              = new() { Key = "entire-property", DisplayName = "Entire Property" };
    [Label("Single Room Rental — Shared Living")]
    [Label("de", "Einzelzimmer — geteilte Wohnung")]
    public static readonly RentalModel SingleRoomRentalSharedLiving = new() { Key = "single-room-rental-shared-living", DisplayName = "Single Room Rental — Shared Living" };

    public static IReadOnlyList<RentalModel> All { get; } = [EntireProperty, SingleRoomRentalSharedLiving];
}
