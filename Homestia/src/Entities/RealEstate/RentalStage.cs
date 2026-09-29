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
    [Label("Rental Stage")]
    [Label("de", "Mietphase")]
[Entity(Path = "rental-stages", PredicatePath = "rentalStage")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RentalStage
{
    [Label("Key")]
    [Label("de", "Schlüssel")]
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Label("Display name")]
    [Label("de", "Anzeigename")]
    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [Label("Application")]
    [Label("de", "Bewerbung")]
    public static readonly RentalStage Application = new() { Key = "application", DisplayName = "Application" };
    [Label("Contract")]
    [Label("de", "Vertrag")]
    public static readonly RentalStage Contract    = new() { Key = "contract", DisplayName = "Contract" };
    [Label("Deposit")]
    [Label("de", "Kaution")]
    public static readonly RentalStage Deposit     = new() { Key = "deposit", DisplayName = "Deposit" };
    [Label("Handover")]
    [Label("de", "Übergabe")]
    public static readonly RentalStage Handover    = new() { Key = "handover", DisplayName = "Handover" };
    [Label("Tenancy")]
    [Label("de", "Mietzeit")]
    public static readonly RentalStage Tenancy     = new() { Key = "tenancy", DisplayName = "Tenancy" };
    [Label("Termination Noticed")]
    [Label("de", "Kündigung angekündigt")]
    public static readonly RentalStage Noticed     = new() { Key = "noticed", DisplayName = "Termination Noticed" };
    [Label("Handback")]
    [Label("de", "Rückgabe")]
    public static readonly RentalStage Handback    = new() { Key = "handback", DisplayName = "Handback" };
    [Label("Terminated")]
    [Label("de", "Beendet")]
    public static readonly RentalStage Terminated  = new() { Key = "terminated", DisplayName = "Terminated" };

    public static IReadOnlyList<RentalStage> All { get; } =
    [
        Application, Contract, Deposit, Handover, Tenancy, Noticed, Handback, Terminated,
    ];
}
