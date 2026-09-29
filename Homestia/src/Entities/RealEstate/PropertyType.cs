using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// PropertyType — enumeration of real-estate property kinds.
/// Fixed set: Apartment, Studio.
/// </summary>
[Label("Property Type")]
[Label("de", "Objekttyp")]
[Entity(Path = "property-types", PredicatePath = "propertyType")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class PropertyType
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

    [Label("Apartment")]
    [Label("de", "Wohnung")]
    public static readonly PropertyType Apartment = new() { Key = "apartment", DisplayName = "Apartment" };
    [Label("Studio")]
    [Label("de", "Studio — Einzimmerapartment")]
    public static readonly PropertyType Studio    = new() { Key = "studio", DisplayName = "Studio" };

    public static IReadOnlyList<PropertyType> All { get; } = [Apartment, Studio];
}
