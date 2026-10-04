using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// Tenant — a person renting under a <see cref="Rental"/> agreement.
/// <br/><br/>
/// A tenant is its own entity: it owns its instance-IRI namespace, its type and its predicate space. It
/// used to inherit a stub <c>Aletheia.Authentication.Agent</c> — a placeholder for an authentication
/// layer that the platform now provides as <c>Aletheia.Sdk.Authorization.Entity.Agent</c>, a sign-in
/// principal carrying a token identity that a tenant neither has nor needs. The only member it inherited
/// was its display name, which is declared here, where it belongs.
/// </summary>
[Label("Tenant")]
[Label("de", "Mieter")]
[Entity(Path = "tenants", PredicatePath = "tenant")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints("tenants")]
public partial class Tenant
{
    /// <summary>The tenant's name — the one field every list and picker shows.</summary>
    [Label("Name")]
    [Label("de", "Name")]
    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [Label("Email")]
    [Label("de", "E-Mail")]
    [Predicate("email")]
    public string Email { get; set; } = string.Empty;

    [Label("Phone")]
    [Label("de", "Telefon")]
    [Predicate("phone")]
    public string Phone { get; set; } = string.Empty;
}
