# ══════════════════════════════════════════════════════════════════════════════
# Homestia — Docker build (VPS / Fly.io)
#
# Build context: workspace containing the Homestia repo checkout at ./Homestia
# (repo root -> Homestia/, dotnet root -> Homestia/Homestia/). There is NO
# sibling Aletheia checkout — the Aletheia SDK (Aletheia.Sdk.*) is restored from
# the GitHub Packages NuGet feed configured in ../nuget.config
# (nuget.pkg.github.com/rennnyyy).
#
# The Angular facade build (Homestia.Web.targets) runs during dotnet publish.
# The compiled Sdk.Web admin is delivered from the Aletheia.Sdk.Web package into
# aletheia-wwwroot/ by that package's own build targets.
#
# Deploy:  bash Homestia/scripts/deploy.sh
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 0: Build (SDK + Node.js for Angular) ──────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

# Install Node.js 22 — required by the MSBuild Angular build target
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Optional GitHub Packages NuGet credentials for the Aletheia feed.
# Only required while the Aletheia packages are PRIVATE (public packages restore
# anonymously). Leave empty for public packages.
ARG NUGET_USERNAME=
ARG NUGET_PASSWORD=

# Aletheia SDK version to consume (resolved to the latest CI build by the
# workflow). Empty -> the committed AletheiaSdkVersion default in
# Directory.Build.props is used.
ARG ALETHEIA_SDK_VERSION=

WORKDIR /src

# Copy the Homestia solution (repo root nuget.config + dotnet root)
COPY Homestia/nuget.config Homestia/nuget.config
COPY Homestia/Homestia/ Homestia/Homestia/

# Authenticate to the Aletheia NuGet feed when credentials are supplied.
# Must run from inside Homestia/ so the repo nuget.config (which declares the
# "github" source) is in scope — NuGet only walks UP the directory tree, so from
# /src it would miss Homestia/nuget.config and the update throws
# "Object reference not set to an instance of an object.". The credentials are
# written to the user-level config (~/.nuget/...), which the later restore merges.
WORKDIR /src/Homestia
RUN if [ -n "$NUGET_USERNAME" ] && [ -n "$NUGET_PASSWORD" ]; then \
      dotnet nuget update source github -u "$NUGET_USERNAME" -p "$NUGET_PASSWORD" --store-password-in-clear-text; \
    fi

# Restore and publish — MSBuild Angular target fires automatically, building the
# facade into wwwroot/browser/ before the .NET publish. The resolved Aletheia
# version (when supplied) is applied to BOTH restore and publish so the
# central-managed Aletheia.Sdk.* versions match the restored assets.
WORKDIR /src/Homestia/Homestia
RUN dotnet restore src/Program/Homestia.Program.csproj \
    ${ALETHEIA_SDK_VERSION:+-p:AletheiaSdkVersion="$ALETHEIA_SDK_VERSION"}

# Limit Node.js heap to prevent OOM kills in constrained build environments.
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN dotnet publish src/Program/Homestia.Program.csproj \
    -c Release \
    -o /app \
    --no-restore \
    ${ALETHEIA_SDK_VERSION:+-p:AletheiaSdkVersion="$ALETHEIA_SDK_VERSION"}

# ── Stage 1: Production runtime ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "Homestia.Program.dll"]
