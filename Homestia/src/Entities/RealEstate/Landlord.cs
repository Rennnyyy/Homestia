using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Landlord — the owner of one or more <see cref="Property">Properties</see>,
/// represented by an <see cref="Agent"/>.
/// </summary>
[Entity(Path = "landlords")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Landlord
{
    /// <summary>
    /// The type of properties this landlord primarily manages.
    /// </summary>
    [Owning("landlordType")]
    public partial EntityRef<PropertyType>? LandlordType { get; set; }

    /// <summary>
    /// The agent who represents this landlord.
    /// Mirrors the <c>Aletheia.Authentication.Agent</c> relationship.
    /// </summary>
    [Owning("representedBy")]
    public partial EntityRef<Aletheia.Authentication.Agent>? Agent { get; set; }

    /// <summary>Properties owned by this landlord.</summary>
    [Owning("owns")]
    public partial EntityRefCollection<Property> Properties { get; }
}
