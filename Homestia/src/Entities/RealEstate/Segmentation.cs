using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Segmentation — abstract base for any spatially-defined part of a property.
/// <see cref="Property"/>, <see cref="Room"/>, and <see cref="CommonArea"/> all
/// derive from this base, sharing a common identity space and the <c>Name</c> property.
/// </summary>
[Entity(Path = "segmentations")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Segmentation
{
    [Predicate("name")]
    public string Name { get; set; } = string.Empty;

    [Predicate("isCommonArea")]
    public bool IsCommonArea { get; set; }

    /// <summary>Owning: the property this segmentation belongs to.</summary>
    [Owning("isPartOf")]
    public partial EntityRef<Property>? IsPartOf { get; set; }
}
