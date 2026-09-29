using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// FurnishingStatus — enumeration of how furnished a room is.
/// Fixed set: Unfurnished, PartiallyFurnished, FullyFurnished.
/// </summary>
[Label("Furnishing Status")]
[Label("de", "Einrichtungsstatus")]
[Entity(Path = "furnishing-statuses", PredicatePath = "furnishingStatus")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class FurnishingStatus
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

    [Label("Unfurnished")]
    [Label("de", "Unmöbliert")]
    public static readonly FurnishingStatus Unfurnished        = new() { Key = "unfurnished", DisplayName = "Unfurnished" };
    [Label("Partially Furnished")]
    [Label("de", "Teilmöbliert")]
    public static readonly FurnishingStatus PartiallyFurnished = new() { Key = "partially-furnished", DisplayName = "Partially Furnished" };
    [Label("Fully Furnished")]
    [Label("de", "Vollmöbliert")]
    public static readonly FurnishingStatus FullyFurnished     = new() { Key = "fully-furnished", DisplayName = "Fully Furnished" };

    public static IReadOnlyList<FurnishingStatus> All { get; } = [Unfurnished, PartiallyFurnished, FullyFurnished];
}
