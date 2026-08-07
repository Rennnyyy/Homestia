using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Aletheia.Authentication;

/// <summary>
/// Agent — the canonical identity principal from the Aletheia core authentication layer.
/// This stub lives in the expected <c>Aletheia.Authentication</c> namespace so the
/// real-estate domain can reference agents without a hard package dependency.
/// Replace with the NuGet package when the authentication layer is published.
/// </summary>
[Entity(Path = "agents")]
[Identity(IdentityGenerator.Random)]
[OperationEndpoints]
public partial class Agent
{
    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;
}
