# ══════════════════════════════════════════════════════════════════════════════
# Homestia — Docker build for Fly.io
#
# Build context: Katharsis/ (contains both Aletheia/SDK/ and Homestia/Homestia/)
#
# The MSBuild target BuildAngularFrontend (in Program.csproj) handles the
# entire Angular build — npm ci + ng build — during dotnet publish.
# No separate Node stage needed.
#
# Deploy:  bash Homestia/Homestia/deploy/deploy.sh
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 0: Build (SDK + Node.js for Angular) ──────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

# Install Node.js 22 — required by the MSBuild Angular build target
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Copy the Aletheia SDK (referenced by Homestia via project references)
COPY Aletheia/SDK/ Aletheia/SDK/

# Copy the Homestia solution (includes src/Web/App/ Angular source)
COPY Homestia/Homestia/ Homestia/Homestia/

# Restore and publish — MSBuild BuildAngularFrontend target fires automatically,
# building Angular into wwwroot/browser/ before the .NET publish.
WORKDIR /src/Homestia/Homestia
RUN dotnet restore src/Program/Homestia.Program.csproj

# Limit Node.js heap to prevent OOM kills in constrained build environments.
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN dotnet publish src/Program/Homestia.Program.csproj \
    -c Release \
    -o /app \
    --no-restore

# ── Stage 1: Production runtime ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "Homestia.Program.dll"]
