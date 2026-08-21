using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Operations;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// RentalAgreementStatus — enumeration of a rental agreement's lifecycle state.
/// Fixed set: Preparation, Signed, Active, Terminated, Handled, Cancelled.
/// </summary>
[Entity(Path = "rental-agreement-statuses", PredicatePath = "rentalAgreementStatus")]
[Identity(IdentityGenerator.PropertyBasedPlain)]
[Enumeration]
[OperationEndpoints]
public partial class RentalAgreementStatus
{
    [IdentityPart(0)]
    [Predicate("key")]
    public partial string Key { get; init; }

    [Predicate("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    public static readonly RentalAgreementStatus Preparation = new() { Key = "preparation", DisplayName = "Preparation" };
    public static readonly RentalAgreementStatus Signed      = new() { Key = "signed", DisplayName = "Signed" };
    public static readonly RentalAgreementStatus Active      = new() { Key = "active", DisplayName = "Active" };
    public static readonly RentalAgreementStatus Terminated  = new() { Key = "terminated", DisplayName = "Terminated" };
    public static readonly RentalAgreementStatus Handled     = new() { Key = "handled", DisplayName = "Handled" };
    public static readonly RentalAgreementStatus Cancelled   = new() { Key = "cancelled", DisplayName = "Cancelled" };

    public static IReadOnlyList<RentalAgreementStatus> All { get; } =
        [Preparation, Signed, Active, Terminated, Handled, Cancelled];
}
