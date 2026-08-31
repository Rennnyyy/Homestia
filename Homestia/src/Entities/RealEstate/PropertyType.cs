using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// PropertyType — enumeration of real-estate property kinds.
/// Fixed set: Apartment, Studio.
/// </summary>
[Entity(Path = "property-types", PredicatePath = "propertyType")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class PropertyType
{
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    public static readonly PropertyType Apartment = new() { Key = "apartment", DisplayName = "Apartment" };
    public static readonly PropertyType Studio    = new() { Key = "studio", DisplayName = "Studio" };

    public static IReadOnlyList<PropertyType> All { get; } = [Apartment, Studio];
}
