# ══════════════════════════════════════════════════════════════════════════════
# Homestia — Docker build (katharsis VPS)
#
# Build context: the repo root (the pipeline checks out at the top level).
#   Homestia/          -> dotnet root (Homestia.slnx, src/, tests/)
#   Homestia.Frontend/ -> Angular facade workspace
# There is NO sibling Aletheia checkout — the Aletheia SDK (Aletheia.Sdk.*) is
# restored from the GitHub Packages NuGet feed configured in nuget.config
# (nuget.pkg.github.com/rennnyyy).
#
# The Angular facade is built explicitly in this stage (npm ci + ng build) and
# woven in by the .NET publish; the MSBuild hook is opt-in and stays off.
# The compiled Sdk.Web admin is delivered from the Aletheia.Sdk.Web package into
# aletheia-wwwroot/ by that package's own build targets.
#
# Deploy:  bash deployment/scripts/deploy.sh
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 0: Build ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

# SKIP_ANGULAR=true reuses a prebuilt facade wwwroot from the build context
# (CI downloads the `homestia-wwwroot` artifact) instead of running npm
# in-container — the facade is built exactly once per push, by the
# `frontend-build-test` job. Default false keeps `docker build` self-contained.
ARG SKIP_ANGULAR=false

# Install Node.js 22 — required by the facade build, skipped when the facade is
# already built in the context.
RUN if [ "$SKIP_ANGULAR" != "true" ]; then \
      apt-get update && \
      apt-get install -y --no-install-recommends curl gnupg && \
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
      apt-get install -y nodejs && \
      apt-get clean && rm -rf /var/lib/apt/lists/*; \
    fi

# Optional GitHub Packages NuGet credentials for the Aletheia feed.
# Only required while the Aletheia packages are PRIVATE (public packages restore
# anonymously). Leave empty for public packages.
ARG NUGET_USERNAME=
ARG NUGET_PASSWORD=

# Optional GitHub Packages npm credentials for the @rennnyyy/aletheia-* frontend
# packages — the Angular facade (Homestia.Frontend) depends on them directly. Same
# classic PAT as the NuGet feed above; publishing needs write:packages, while
# installing needs only read:packages. Written to the user-level .npmrc, never
# into the repo.
ARG NPM_TOKEN=

WORKDIR /src

# Copy the repo: the dotnet root, the Angular facade, and the repo-level
# nuget.config placed INTO the dotnet root (NuGet walks up from /src/Homestia).
COPY Homestia/ Homestia/
COPY Homestia.Frontend/ Homestia.Frontend/
COPY nuget.config Homestia/nuget.config

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

# npm auth for the @rennnyyy scope. The Angular build runs `npm ci` in
# Homestia.Frontend and installs those packages from npm.pkg.github.com, so the
# credentials must exist before the build. Gated on SKIP_ANGULAR too: when the
# facade was prebuilt (CI), Node/npm is never installed in this image and the
# step must not run (npm: not found would fail the build).
RUN if [ "$SKIP_ANGULAR" != "true" ] && [ -n "$NPM_TOKEN" ]; then \
      npm config set //npm.pkg.github.com/:_authToken "$NPM_TOKEN" --location user; \
    fi

# Build the Angular facade EXPLICITLY when not already built (the MSBuild hook
# Homestia.Web.targets is opt-in and does NOT fire during `dotnet publish`).
WORKDIR /src/Homestia.Frontend
# Limit Node.js heap to prevent OOM kills in constrained build environments.
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN if [ "$SKIP_ANGULAR" != "true" ]; then \
      npm ci && npm run build -- --configuration production; \
    else \
      echo "SKIP_ANGULAR=true — reusing prebuilt Homestia/src/Program/wwwroot from the build context"; \
    fi

# Restore and publish the host. The Aletheia SDK version comes from the committed
# AletheiaSdkVersion pin (Directory.Build.props), which Directory.Packages.props
# applies to every Aletheia.Sdk.* package.
WORKDIR /src/Homestia
RUN dotnet restore src/Program/Homestia.Program.csproj

RUN dotnet publish src/Program/Homestia.Program.csproj \
    -c Release \
    -o /app \
    --no-restore \
    -p:SkipAngularBuild=true

# ── Stage 1: Production runtime ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "Homestia.Program.dll"]
