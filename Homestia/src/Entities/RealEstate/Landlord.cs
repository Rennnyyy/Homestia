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
    /// The sign-in identity that represents this landlord — the Aletheia authorization
    /// <see cref="Aletheia.Sdk.Authorization.Entity.Agent"/> the JWT identity is projected onto.
    /// <br/><br/>
    /// This is the link the access gates resolve against: the platform binds the caller's agent
    /// as <c>?agentIri</c>, and a property is reachable exactly when the landlord it carries
    /// names that agent. A landlord is provisioned for an agent the first time it creates a
    /// property, and reused for every property after that.
    /// </summary>
    [Label("Represented By")]
    [Label("de", "Vertreten durch")]
    [Owning("representedBy")]
    public partial EntityRef<Aletheia.Sdk.Authorization.Entity.Agent>? Agent { get; set; }

    /// <summary>
    /// Properties owned by this landlord — the read-only inverse of
    /// <see cref="Property.Landlord"/>. The property owns the link, so a write sets the
    /// landlord on the property; this side reflects it and is never persisted.
    /// </summary>
    [Label("Owns")]
    [Label("de", "Besitzt")]
    [Inverse(nameof(Property.Landlord), "owns")]
    public partial EntityRefCollection<Property> Properties { get; }
}
