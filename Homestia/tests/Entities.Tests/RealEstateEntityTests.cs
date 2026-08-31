using Aletheia.Authentication;
using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Aletheia.Sdk.Operations;
using Homestia.Entities.RealEstate;
using Shouldly;

namespace Homestia.Entities.RealEstate.Tests;

/// <summary>
/// Unit tests for the Homestia real-estate domain entities.
/// Validates entity metadata, identity strategies, attribute presence,
/// and the entity inheritance hierarchy.
/// </summary>
public sealed class RealEstateEntityTests
{
    // ═══════════════════════════════════════════════════════════════
    // Enumeration entities — PropertyType
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void PropertyType_is_enumeration_entity()
    {
        var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
            typeof(PropertyType), typeof(EntityAttribute))!;
        entityAttr.ShouldNotBeNull();
        entityAttr.Path.ShouldBe("property-types");

        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(PropertyType), typeof(IdentityAttribute))!;
        identityAttr.ShouldNotBeNull();
        identityAttr.Generator.ShouldBe(IdentityGenerator.PropertyBasedPlain);

        var enumAttr = (EnumerationAttribute)Attribute.GetCustomAttribute(
            typeof(PropertyType), typeof(EnumerationAttribute))!;
        enumAttr.ShouldNotBeNull();
    }

    [Fact]
    public void PropertyType_has_two_named_individuals()
    {
        PropertyType.All.Count.ShouldBe(2);
        PropertyType.Apartment.Key.ShouldBe("apartment");
        PropertyType.Studio.Key.ShouldBe("studio");
    }

    // ═══════════════════════════════════════════════════════════════
    // Enumeration entities — RentalModel
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void RentalModel_is_enumeration_entity()
    {
        var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
            typeof(RentalModel), typeof(EntityAttribute))!;
        entityAttr.Path.ShouldBe("rental-models");

        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(RentalModel), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.PropertyBasedPlain);

        var enumAttr = (EnumerationAttribute)Attribute.GetCustomAttribute(
            typeof(RentalModel), typeof(EnumerationAttribute))!;
        enumAttr.ShouldNotBeNull();
    }

    [Fact]
    public void RentalModel_has_two_named_individuals()
    {
        RentalModel.All.Count.ShouldBe(2);
        RentalModel.EntireProperty.Key.ShouldBe("entire-property");
        RentalModel.SingleRoomRentalSharedLiving.Key.ShouldBe("single-room-rental-shared-living");
    }

    // ═══════════════════════════════════════════════════════════════
    // Enumeration entities — FurnishingStatus
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void FurnishingStatus_is_enumeration_entity()
    {
        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(FurnishingStatus), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.PropertyBasedPlain);

        var enumAttr = (EnumerationAttribute)Attribute.GetCustomAttribute(
            typeof(FurnishingStatus), typeof(EnumerationAttribute))!;
        enumAttr.ShouldNotBeNull();
    }

    [Fact]
    public void FurnishingStatus_has_three_named_individuals()
    {
        FurnishingStatus.All.Count.ShouldBe(3);
        FurnishingStatus.Unfurnished.Key.ShouldBe("unfurnished");
        FurnishingStatus.PartiallyFurnished.Key.ShouldBe("partially-furnished");
        FurnishingStatus.FullyFurnished.Key.ShouldBe("fully-furnished");
    }

    // ═══════════════════════════════════════════════════════════════
    // Enumeration entities — RoomStatus
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void RoomStatus_is_enumeration_entity()
    {
        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(RoomStatus), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.PropertyBasedPlain);

        var enumAttr = (EnumerationAttribute)Attribute.GetCustomAttribute(
            typeof(RoomStatus), typeof(EnumerationAttribute))!;
        enumAttr.ShouldNotBeNull();
    }

    [Fact]
    public void RoomStatus_has_four_named_individuals()
    {
        RoomStatus.All.Count.ShouldBe(4);
        RoomStatus.Available.Key.ShouldBe("available");
        RoomStatus.Reserved.Key.ShouldBe("reserved");
        RoomStatus.ActivelyRented.Key.ShouldBe("actively-rented");
        RoomStatus.Blocked.Key.ShouldBe("blocked");
    }

    // ═══════════════════════════════════════════════════════════════
    // Agent
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Agent_entity_has_correct_path_and_identity()
    {
        var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
            typeof(Agent), typeof(EntityAttribute))!;
        entityAttr.ShouldNotBeNull();
        entityAttr.Path.ShouldBe("agents");

        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(Agent), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.Random);
    }

    [Fact]
    public void Agent_has_expected_scalar_properties()
    {
        var type = typeof(Agent);
        type.GetProperty("DisplayName")!.PropertyType.ShouldBe(typeof(string));
    }

    [Fact]
    public void Agent_has_predicate_attributes_on_all_user_properties()
    {
        AssertPredicatesOnUserProperties(typeof(Agent),
            autoGenerated: ["Iri", "IsIdentitySealed", "IdentityParts", "Enrichment"]);
    }

    [Fact]
    public void New_Agent_has_default_values()
    {
        var agent = new Agent();
        agent.DisplayName.ShouldBe(string.Empty);
    }

    // ═══════════════════════════════════════════════════════════════
    // Segmentation (base entity)
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Segmentation_entity_has_correct_path_and_identity()
    {
        var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
            typeof(Segmentation), typeof(EntityAttribute))!;
        entityAttr.Path.ShouldBe("segmentations");

        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(Segmentation), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.Random);
    }

    [Fact]
    public void Segmentation_has_name_property()
    {
        var type = typeof(Segmentation);
        type.GetProperty("Name")!.PropertyType.ShouldBe(typeof(string));
    }

    [Fact]
    public void Segmentation_has_isCommonArea_property()
    {
        var type = typeof(Segmentation);
        type.GetProperty("IsCommonArea")!.PropertyType.ShouldBe(typeof(bool));
    }

    [Fact]
    public void New_Segmentation_has_default_values()
    {
        var seg = new Segmentation();
        seg.Name.ShouldBe(string.Empty);
        seg.IsCommonArea.ShouldBeFalse();
    }

    // ═══════════════════════════════════════════════════════════════
    // Property : Segmentation
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Property_inherits_from_Segmentation()
    {
        typeof(Property).BaseType.ShouldBe(typeof(Segmentation));
    }

    [Fact]
    public void Property_has_OperationEndpoints_with_custom_route()
    {
        var attr = (OperationEndpointsAttribute)Attribute.GetCustomAttribute(
            typeof(Property), typeof(OperationEndpointsAttribute))!;
        attr.ShouldNotBeNull();
    }

    [Fact]
    public void Property_has_expected_scalars_and_references()
    {
        var type = typeof(Property);
        // Inherited
        type.GetProperty("Name")!.PropertyType.ShouldBe(typeof(string));
        // Own scalars
        type.GetProperty("Address")!.PropertyType.ShouldBe(typeof(string));
    }

    [Fact]
    public void New_Property_has_default_values()
    {
        var property = new Property();
        property.Name.ShouldBe(string.Empty);
        property.Address.ShouldBe(string.Empty);
    }

    // ═══════════════════════════════════════════════════════════════
    // Room : Segmentation
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Room_inherits_from_Segmentation()
    {
        typeof(Room).BaseType.ShouldBe(typeof(Segmentation));
    }

    [Fact]
    public void Room_has_OperationEndpoints_with_custom_route()
    {
        var attr = (OperationEndpointsAttribute)Attribute.GetCustomAttribute(
            typeof(Room), typeof(OperationEndpointsAttribute))!;
        attr.ShouldNotBeNull();
    }

    [Fact]
    public void Room_has_expected_scalar_properties()
    {
        var type = typeof(Room);
        type.GetProperty("Name")!.PropertyType.ShouldBe(typeof(string)); // inherited
        type.GetProperty("RoomSize")!.PropertyType.ShouldBe(typeof(decimal?));
        type.GetProperty("Location")!.PropertyType.ShouldBe(typeof(string));
    }

    [Fact]
    public void New_Room_has_default_values()
    {
        var room = new Room();
        room.Name.ShouldBe(string.Empty);
        room.RoomSize.ShouldBeNull(); // room size is optional
        room.Location.ShouldBe(string.Empty);
    }

    // ═══════════════════════════════════════════════════════════════
    // CommonArea : Segmentation
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void CommonArea_inherits_from_Segmentation()
    {
        typeof(CommonArea).BaseType.ShouldBe(typeof(Segmentation));
    }

    [Fact]
    public void CommonArea_has_OperationEndpoints_with_custom_route()
    {
        var attr = (OperationEndpointsAttribute)Attribute.GetCustomAttribute(
            typeof(CommonArea), typeof(OperationEndpointsAttribute))!;
        attr.ShouldNotBeNull();
    }

    [Fact]
    public void New_CommonArea_has_default_name()
    {
        var area = new CommonArea();
        area.Name.ShouldBe(string.Empty);
    }

    // ═══════════════════════════════════════════════════════════════
    // Studio : Segmentation
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Studio_inherits_from_Segmentation()
    {
        typeof(Studio).BaseType.ShouldBe(typeof(Segmentation));
    }

    [Fact]
    public void Studio_has_OperationEndpoints_with_custom_route()
    {
        var attr = (OperationEndpointsAttribute)Attribute.GetCustomAttribute(
            typeof(Studio), typeof(OperationEndpointsAttribute))!;
        attr.ShouldNotBeNull();
    }

    [Fact]
    public void New_Studio_has_default_values()
    {
        var studio = new Studio();
        studio.Name.ShouldBe(string.Empty);
        studio.IsCommonArea.ShouldBeFalse();
    }

    // ═══════════════════════════════════════════════════════════════
    // InventoryItem
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void InventoryItem_entity_has_correct_path_and_identity()
    {
        var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
            typeof(InventoryItem), typeof(EntityAttribute))!;
        entityAttr.Path.ShouldBe("inventory-items");

        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(InventoryItem), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.Random);
    }

    [Fact]
    public void InventoryItem_has_name_property()
    {
        typeof(InventoryItem).GetProperty("Name")!.PropertyType.ShouldBe(typeof(string));
    }

    [Fact]
    public void New_InventoryItem_has_default_name()
    {
        var item = new InventoryItem();
        item.Name.ShouldBe(string.Empty);
    }

    // ═══════════════════════════════════════════════════════════════
    // Landlord
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Landlord_entity_has_correct_path_and_identity()
    {
        var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
            typeof(Landlord), typeof(EntityAttribute))!;
        entityAttr.Path.ShouldBe("landlords");

        var identityAttr = (IdentityAttribute)Attribute.GetCustomAttribute(
            typeof(Landlord), typeof(IdentityAttribute))!;
        identityAttr.Generator.ShouldBe(IdentityGenerator.Random);
    }

    [Fact]
    public void Landlord_has_OperationEndpoints()
    {
        var attr = (OperationEndpointsAttribute)Attribute.GetCustomAttribute(
            typeof(Landlord), typeof(OperationEndpointsAttribute))!;
        attr.ShouldNotBeNull();
    }

    // ═══════════════════════════════════════════════════════════════
    // Entity inheritance — Property / Room / CommonArea are Segmentations
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void Property_is_assignable_to_Segmentation()
    {
        typeof(Segmentation).IsAssignableFrom(typeof(Property)).ShouldBeTrue();
    }

    [Fact]
    public void Room_is_assignable_to_Segmentation()
    {
        typeof(Segmentation).IsAssignableFrom(typeof(Room)).ShouldBeTrue();
    }

    [Fact]
    public void CommonArea_is_assignable_to_Segmentation()
    {
        typeof(Segmentation).IsAssignableFrom(typeof(CommonArea)).ShouldBeTrue();
    }

    [Fact]
    public void Studio_is_assignable_to_Segmentation()
    {
        typeof(Segmentation).IsAssignableFrom(typeof(Studio)).ShouldBeTrue();
    }

    [Fact]
    public void All_derived_segmentations_do_not_redeclare_path()
    {
        // Derived entities must not set Path on [Entity] — only PredicatePath.
        foreach (var derived in new[] { typeof(Property), typeof(Room), typeof(CommonArea), typeof(Studio) })
        {
            var entityAttr = (EntityAttribute)Attribute.GetCustomAttribute(
                derived, typeof(EntityAttribute))!;
            entityAttr.Path.ShouldBeNull(
                $"{derived.Name} must not set Path — the base Segmentation owns it.");
        }
    }

    [Fact]
    public void All_derived_segmentations_do_not_redeclare_identity()
    {
        // Derived entities must not set [Identity] — the base owns it.
        foreach (var derived in new[] { typeof(Property), typeof(Room), typeof(CommonArea), typeof(Studio) })
        {
            var identityAttr = Attribute.GetCustomAttribute(
                derived, typeof(IdentityAttribute));
            identityAttr.ShouldBeNull(
                $"{derived.Name} must not declare [Identity] — the base Segmentation owns it.");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Predicate attribute coverage
    // ═══════════════════════════════════════════════════════════════

    [Fact]
    public void All_entities_have_predicates_on_scalar_properties()
    {
        var entities = new[]
        {
            typeof(Agent),
            typeof(Segmentation),
            typeof(Property),
            typeof(Room),
            typeof(CommonArea),
            typeof(Studio),
            typeof(InventoryItem),
            typeof(Landlord),
            typeof(Rental),
            typeof(RentalDocument),
            typeof(RentalStage),
            typeof(Tenant),
        };

        foreach (var entityType in entities)
        {
            AssertPredicatesOnUserProperties(entityType,
                autoGenerated: ["Iri", "IsIdentitySealed", "IdentityParts", "Enrichment"]);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════

    private static void AssertPredicatesOnUserProperties(
        Type entityType,
        HashSet<string> autoGenerated)
    {
        foreach (var prop in entityType.GetProperties())
        {
            if (autoGenerated.Contains(prop.Name))
                continue;

            // Static members (enumeration catalogs like `All`) are not entity data.
            if (prop.GetMethod?.IsStatic == true)
                continue;

            // EntityRef<T> and EntityRefCollection<T> are relationship properties
            // declared as partial — they do not require [Predicate]; they use [Owning]/[Inverse].
            if (prop.PropertyType.IsGenericType)
            {
                var genDef = prop.PropertyType.GetGenericTypeDefinition();
                if (genDef == typeof(EntityRef<>) || genDef.Name == "EntityRefCollection`1")
                    continue;
            }

            // List<T> collection properties use [Predicate].
            var attr = Attribute.GetCustomAttribute(prop, typeof(PredicateAttribute));
            attr.ShouldNotBeNull(
                $"Property '{prop.Name}' on {entityType.Name} is missing a [Predicate] attribute.");
        }
    }
}
