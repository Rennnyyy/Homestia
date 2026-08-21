using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;

namespace Aletheia.Sdk.Program.Entities.RealEstate;

/// <summary>
/// RentalAgreementDocument — a document (e.g. a signed contract scan) attached to a
/// <see cref="RentalAgreement"/>. Object-bearing: the binary content lives in the
/// configured object store, the metadata (description, reference) in the graph.
/// </summary>
[Entity(Path = "rental-agreement-documents", PredicatePath = "rentalAgreementDocument")]
[Identity(IdentityGenerator.Random)]
[ObjectBearing("rental-agreement-documents")]
public partial class RentalAgreementDocument
{
    [Predicate("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>The agreement this document is attached to — inverse of <see cref="RentalAgreement.Attachments"/>.</summary>
    [Inverse("Attachments", "hasAttachments")]
    public partial EntityRef<RentalAgreement>? AttachedTo { get; }
}
