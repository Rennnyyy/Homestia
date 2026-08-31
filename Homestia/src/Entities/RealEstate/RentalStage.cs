using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// RentalStage — enumeration of the lifecycle stages of a <see cref="Rental"/>
/// agreement. Each stage has its own frontend view aspect; a stage unlocks the
/// next once its view validates (see ViewAspects.RentalStage* shapes).
/// Fixed set: Application, Contract, Deposit, Handover, Tenancy, Noticed,
/// Handback, Terminated.
/// </summary>
[Entity(Path = "rental-stages", PredicatePath = "rentalStage")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RentalStage
{
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    public static readonly RentalStage Application = new() { Key = "application", DisplayName = "Application" };
    public static readonly RentalStage Contract    = new() { Key = "contract", DisplayName = "Contract" };
    public static readonly RentalStage Deposit     = new() { Key = "deposit", DisplayName = "Deposit" };
    public static readonly RentalStage Handover    = new() { Key = "handover", DisplayName = "Handover" };
    public static readonly RentalStage Tenancy     = new() { Key = "tenancy", DisplayName = "Tenancy" };
    public static readonly RentalStage Noticed     = new() { Key = "noticed", DisplayName = "Termination Noticed" };
    public static readonly RentalStage Handback    = new() { Key = "handback", DisplayName = "Handback" };
    public static readonly RentalStage Terminated  = new() { Key = "terminated", DisplayName = "Terminated" };

    public static IReadOnlyList<RentalStage> All { get; } =
    [
        Application, Contract, Deposit, Handover, Tenancy, Noticed, Handback, Terminated,
    ];
}
