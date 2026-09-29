using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Landlord — the owner of one or more <see cref="Property">Properties</see>,
/// represented by an <see cref="Agent"/>.
/// </summary>
    [Label("Landlord")]
    [Label("de", "Vermieter")]
[Entity(Path = "landlords")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Landlord
{
    /// <summary>
    /// The type of properties this landlord primarily manages.
    /// </summary>
    [Label("Landlord Type")]
    [Label("de", "Vermietertyp")]
    [Owning("landlordType")]
    public partial EntityRef<PropertyType>? LandlordType { get; set; }

    /// <summary>
    /// The agent who represents this landlord.
    /// Mirrors the <c>Aletheia.Authentication.Agent</c> relationship.
    /// </summary>
    [Label("Represented By")]
    [Label("de", "Vertreten durch")]
    [Owning("representedBy")]
    public partial EntityRef<Aletheia.Authentication.Agent>? Agent { get; set; }

    /// <summary>Properties owned by this landlord.</summary>
    [Label("Owns")]
    [Label("de", "Besitzt")]
    [Owning("owns")]
    public partial EntityRefCollection<Property> Properties { get; }
}
