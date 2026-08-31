using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// FurnishingStatus — enumeration of how furnished a room is.
/// Fixed set: Unfurnished, PartiallyFurnished, FullyFurnished.
/// </summary>
[Entity(Path = "furnishing-statuses", PredicatePath = "furnishingStatus")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class FurnishingStatus
{
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    public static readonly FurnishingStatus Unfurnished        = new() { Key = "unfurnished", DisplayName = "Unfurnished" };
    public static readonly FurnishingStatus PartiallyFurnished = new() { Key = "partially-furnished", DisplayName = "Partially Furnished" };
    public static readonly FurnishingStatus FullyFurnished     = new() { Key = "fully-furnished", DisplayName = "Fully Furnished" };

    public static IReadOnlyList<FurnishingStatus> All { get; } = [Unfurnished, PartiallyFurnished, FullyFurnished];
}
