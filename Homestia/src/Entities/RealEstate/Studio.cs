using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Studio — a studio apartment, which is a special kind of <see cref="Segmentation"/>
/// representing a self-contained living unit that combines living, sleeping, and
/// kitchenette areas in a single open space without separate bedrooms.
/// </summary>
[Entity(PredicatePath = "studio")]
[OperationEndpoints("studios")]
public partial class Studio : Segmentation
{
}
