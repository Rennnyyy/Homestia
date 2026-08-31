using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;

namespace Homestia.Entities.RealEstate;

/// <summary>
/// RentalDocument — one uploaded file attached to the Contract stage of a
/// <see cref="Rental"/>. Object-bearing: the binary content lives in the
/// object store and is streamed over the <c>/api/objects/rental-documents/content</c>
/// channel, while the metadata (name, content type, object key) lives in the
/// graph here. A rental holds many documents via its
/// <see cref="Rental.RentalDocuments"/> collection.
/// </summary>
[Entity(Path = "rental-documents", PredicatePath = "rentalDocument")]
[Identity(IdentityGenerator.Random)]
[ObjectBearing("rental-documents")]
public partial class RentalDocument
{
    /// <summary>The original file name, shown in the document list.</summary>
    [Predicate("name")]
    public string Name { get; set; } = string.Empty;
}
