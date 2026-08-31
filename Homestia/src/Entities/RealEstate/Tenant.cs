using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Tenant — a person renting under a <see cref="Rental"/> agreement.
/// Inherits the canonical <see cref="Aletheia.Authentication.Agent"/> identity,
/// so a tenant is also an authentication principal (displayName, agent IRI
/// space) and can be referenced wherever an agent is expected. Identity and
/// the instance IRI path are inherited from <see cref="Aletheia.Authentication.Agent"/>;
/// only the predicate scope ("tenant") and REST endpoint path are tenant-specific.
/// </summary>
[Entity(PredicatePath = "tenant")]
[OperationEndpoints("tenants")]
public partial class Tenant : Aletheia.Authentication.Agent
{
    [Predicate("email")]
    public string Email { get; set; } = string.Empty;

    [Predicate("phone")]
    public string Phone { get; set; } = string.Empty;
}
