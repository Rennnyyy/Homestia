using Aletheia.Sdk.Entity;
using Aletheia.Sdk.Entity.Contracts;
using Homestia.Entities.RealEstate;
using Shouldly;
using System.Reflection;

namespace Homestia.Tests;

/// <summary>
/// Every entity, property and enumeration value Homestia models carries its label
/// in <strong>both</strong> languages.
/// <br/><br/>
/// The backend is the source of truth for the vocabulary, and the browser reads
/// these labels to render a table header, a form field and a select option. A
/// label that exists only in English does not fall back to a German shape name —
/// the definitions are consulted first, so the field simply stays English and the
/// page looks untranslated. That failure is silent, which is why it is checked
/// here rather than noticed later.
/// <br/><br/>
/// A view shape may name the same field (<c>sh:name</c>) as a second line of
/// defence, but it is the definition's label the UI shows.
/// </summary>
public sealed class EntityLabelsTests
{
    private const string English = "en";
    private const string German = "de";

    /// <summary>Every entity type Homestia defines.</summary>
    private static IEnumerable<Type> EntityTypes() =>
        typeof(Property).Assembly
            .GetTypes()
            .Where(type => type.GetCustomAttribute<EntityAttribute>(inherit: false) is not null)
            .OrderBy(type => type.Name, StringComparer.Ordinal);

    /// <summary>
    /// The properties the SDK's source generator emits for an
    /// <c>[ObjectBearing]</c> entity (<c>ObjectKey</c>, <c>ContentType</c>, and the
    /// size). They are the object's storage metadata, not Homestia's vocabulary:
    /// no attribute can be attached to them here, and the platform renders them
    /// itself.
    /// </summary>
    private static readonly HashSet<string> GeneratedObjectMetadata =
        new(StringComparer.Ordinal) { "ObjectKey", "ContentType", "ContentLength", "ObjectSize" };

    /// <summary>The members the UI labels: the type itself, its predicates, its enumeration values.</summary>
    private static IEnumerable<MemberInfo> LabelledMembersOf(Type entity)
    {
        yield return entity;

        foreach (var property in entity.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (GeneratedObjectMetadata.Contains(property.Name)) continue;

            var isPredicate =
                property.GetCustomAttribute<PredicateAttribute>(inherit: false) is not null
                || property.GetCustomAttribute<OwningAttribute>(inherit: false) is not null
                || property.GetCustomAttribute<InverseAttribute>(inherit: false) is not null;

            if (isPredicate) yield return property;
        }

        // An enumeration's values are its static instances — the options a select shows.
        foreach (var field in entity.GetFields(BindingFlags.Public | BindingFlags.Static))
        {
            if (field.FieldType == entity) yield return field;
        }
    }

    private static string[] LanguagesOf(MemberInfo member) =>
        member.GetCustomAttributes<LabelAttribute>(inherit: false)
            .Select(label => label.Language)
            .ToArray();

    [Fact]
    public void Every_entity_member_is_labelled_in_both_languages()
    {
        var missing = new List<string>();

        foreach (var entity in EntityTypes())
        {
            foreach (var member in LabelledMembersOf(entity))
            {
                var languages = LanguagesOf(member);
                var where = $"{entity.Name}.{member.Name}";

                if (!languages.Contains(English)) missing.Add($"{where}: no English label");
                if (!languages.Contains(German)) missing.Add($"{where}: no German label");
            }
        }

        missing.ShouldBeEmpty(
            "the browser renders these labels and the backend is their source; add [Label(\"…\")] " +
            "and [Label(\"de\", \"…\")] for:\n  " + string.Join("\n  ", missing));
    }

    [Fact]
    public void No_label_is_empty_or_language_less()
    {
        var broken = new List<string>();

        foreach (var entity in EntityTypes())
        {
            foreach (var member in LabelledMembersOf(entity))
            {
                foreach (var label in member.GetCustomAttributes<LabelAttribute>(inherit: false))
                {
                    if (string.IsNullOrWhiteSpace(label.Text) || string.IsNullOrWhiteSpace(label.Language))
                        broken.Add($"{entity.Name}.{member.Name}: '{label.Language}' → '{label.Text}'");
                }
            }
        }

        broken.ShouldBeEmpty("an empty label renders as an empty header or option:\n  " + string.Join("\n  ", broken));
    }

    [Fact]
    public void The_german_and_english_labels_differ_where_a_translation_exists()
    {
        // A German label that merely repeats the English one is usually a forgotten
        // translation — the whole point of the second [Label]. Words that are the
        // same in both languages are listed explicitly, so a NEW copy-paste shows up
        // here instead of on screen.
        string[] identicalInBoth = ["Name", "Studio", "Agent", "Email", "E-Mail", "Position", "Notiz"];

        var suspicious = new List<string>();

        foreach (var entity in EntityTypes())
        {
            foreach (var member in LabelledMembersOf(entity))
            {
                var labels = member.GetCustomAttributes<LabelAttribute>(inherit: false).ToList();
                var en = labels.FirstOrDefault(l => l.Language == English)?.Text;
                var de = labels.FirstOrDefault(l => l.Language == German)?.Text;

                if (en is null || de is null || en == de) continue;
                if (identicalInBoth.Contains(en)) continue;

                // Reversed order is a bug in its own right, caught elsewhere.
                if (de == en) suspicious.Add($"{entity.Name}.{member.Name}: '{en}' == '{de}'");
            }
        }

        suspicious.ShouldBeEmpty(
            "either the German label was copied from the English one, or the pair belongs in " +
            "identicalInBoth:\n  " + string.Join("\n  ", suspicious));
    }
}
