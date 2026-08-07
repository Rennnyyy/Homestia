using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Segmentation — abstract base for any spatially-defined part of a property.
/// <see cref="Property"/>, <see cref="Room"/>, and <see cref="CommonArea"/> all
/// derive from this base, sharing a common identity space and the <c>Name</c> property.
/// </summary>
/// <remarks>
/// Entity inheritance follows the Aletheia pattern demonstrated by
/// <c>MagicalScribe : Scribe</c>: the base owns <c>Path</c> and <c>[Identity]</c>;
/// derived types only add properties and optionally override the endpoint route.
/// </remarks>
[Entity(Path = "segmentations")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Segmentation
{
    [Predicate("name")]
    public string Name { get; set; } = string.Empty;

    [Predicate("isCommonArea")]
    public bool IsCommonArea { get; set; }
}
