using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// Tenant — the renting party, extending a core <see cref="Aletheia.Authentication.Agent"/>.
/// </summary>
[Entity(Path = "tenants")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Tenant
{
    /// <summary>The agent this tenant extends.</summary>
    [Owning("extends")]
    public partial EntityRef<Aletheia.Authentication.Agent>? Agent { get; set; }

    /// <summary>Agreements rented by this tenant — inverse of <see cref="RentalAgreement.Tenant"/>.</summary>
    [Inverse("Tenant", "rentedBy")]
    public partial EntityRefCollection<RentalAgreement> Rentals { get; }
}
