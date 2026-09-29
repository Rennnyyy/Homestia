using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// InventoryItem — a physical item (furniture, appliance, etc.) placed in a
/// <see cref="Room"/> or <see cref="CommonArea"/>.
/// </summary>
    [Label("Inventory Item")]
    [Label("de", "Inventargegenstand")]
[Entity(Path = "inventory-items", PredicatePath = "inventoryItem")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class InventoryItem
{
    [Label("Name")]
    [Label("de", "Name")]
    [Predicate("name")]
    public string Name { get; set; } = string.Empty;
}
