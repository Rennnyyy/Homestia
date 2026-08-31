namespace Homestia.Web;

/// <summary>
/// Well-known paths for the Homestia Angular facade, shared between the host
/// (Program) and the web slice.
/// </summary>
public static class HomestiaWebPaths
{
    /// <summary>
    /// The web root serving the compiled Angular facade (<c>wwwroot/browser</c>).
    /// Must be applied at host creation (WebApplicationOptions.WebRootPath) —
    /// .NET 10 rejects changing the web root at runtime.
    /// </summary>
    public static string WebRoot =>
        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "browser");
}
