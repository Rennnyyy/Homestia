using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Landlord — the owner of one or more <see cref="Property">Properties</see>,
/// represented by an <see cref="Aletheia.Authentication.Agent"/>.
/// </summary>
[Entity(Path = "landlords")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Landlord
{
    /// <summary>The agent who represents this landlord.</summary>
    [Owning("representedBy")]
    public partial EntityRef<Aletheia.Authentication.Agent>? Agent { get; set; }

    /// <summary>Properties owned by this landlord — inverse of <see cref="Property.OwnedBy"/>.</summary>
    [Inverse("OwnedBy", "ownedBy")]
    public partial EntityRefCollection<Property> Owns { get; }
}
