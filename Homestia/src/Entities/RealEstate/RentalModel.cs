using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// RentalModel — enumeration of how a property is rented out.
/// Fixed set: EntireProperty, SingleRoomRentalSharedLiving.
/// </summary>
[Entity(Path = "rental-models", PredicatePath = "rentalModel")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RentalModel
{
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    public static readonly RentalModel EntireProperty              = new() { Key = "entire-property", DisplayName = "Entire Property" };
    public static readonly RentalModel SingleRoomRentalSharedLiving = new() { Key = "single-room-rental-shared-living", DisplayName = "Single Room Rental — Shared Living" };

    public static IReadOnlyList<RentalModel> All { get; } = [EntireProperty, SingleRoomRentalSharedLiving];
}
