using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// InventoryItem — a physical item (furniture, appliance, etc.) placed in a
/// <see cref="Room"/> or <see cref="CommonArea"/>.
/// </summary>
[Entity(Path = "inventory-items", PredicatePath = "inventoryItem")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class InventoryItem
{
    [Predicate("name")]
    public string Name { get; set; } = string.Empty;
}
