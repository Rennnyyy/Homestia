using Microsoft.AspNetCore.Builder;

namespace Homestia.Web;

/// <summary>
/// Pipeline extensions for the Homestia web slice — serves the Angular facade.
/// </summary>
public static class WebApplicationExtensions
{
    /// <summary>
    /// Serves the compiled Angular facade from the web root (<c>wwwroot/browser</c>,
    /// see <see cref="HomestiaWebPaths.WebRoot"/>) and falls back to index.html for
    /// client-side routes.
    /// Must be called AFTER all API endpoint mappings and after UseWebInterface() so
    /// API routes and the /aletheia/ admin take priority over the SPA fallback.
    /// </summary>
    public static WebApplication UseHomestiaWeb(this WebApplication app)
    {
        app.UseStaticFiles();
        app.MapFallbackToFile("index.html");
        return app;
    }
}
