# ══════════════════════════════════════════════════════════════════════════════
# Homestia — Multi-stage Docker build for Fly.io
#
# Build context: Katharsis/ (contains both Aletheia/SDK/ and Homestia/Homestia/)
#
# Deploy:  bash Homestia/Homestia/deploy/deploy.sh
# ══════════════════════════════════════════════════════════════════════════════

# ── Stage 0: Angular frontend build ─────────────────────────────────────────
FROM node:22-alpine AS angular-build
WORKDIR /build

# Copy Web project with its full relative path so angular.json's
# outputPath ("../Program/wwwroot") resolves correctly.
COPY Homestia/Homestia/src/Web/package.json \
     Homestia/Homestia/src/Web/package-lock.json \
     Homestia/Homestia/src/Web/

WORKDIR /build/Homestia/Homestia/src/Web
# --legacy-peer-deps: works around Tailwind v3/v4 peer conflict
# between @spartan-ng/brain (requires TW4) and project's tailwindcss@^3.4
RUN npm ci --legacy-peer-deps

# Copy remaining Web source (angular.json, src/, public/, tsconfig*.json, tailwind, postcss)
COPY Homestia/Homestia/src/Web/ ./

# Build Angular for production; output goes to ../Program/wwwroot per angular.json
RUN npx ng build --configuration production

# ── Stage 1: .NET publish ───────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-build
WORKDIR /src

# Copy the Aletheia SDK (referenced by Homestia via project references)
COPY Aletheia/SDK/ Aletheia/SDK/

# Copy the Homestia solution
COPY Homestia/Homestia/ Homestia/Homestia/

# Copy Angular build output into the .NET wwwroot folder
COPY --from=angular-build /build/Homestia/Homestia/src/Program/wwwroot/ \
     Homestia/Homestia/src/Program/wwwroot/

# Restore and publish the .NET host
WORKDIR /src/Homestia/Homestia
RUN dotnet restore src/Program/Aletheia.Sdk.Program.csproj
RUN dotnet publish src/Program/Aletheia.Sdk.Program.csproj \
    -c Release \
    -o /app \
    -p:SkipAngularBuild=true \
    --no-restore

# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=dotnet-build /app ./

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
ENTRYPOINT ["dotnet", "Aletheia.Sdk.Program.dll"]
