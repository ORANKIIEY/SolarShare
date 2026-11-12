# Use the standard .NET 9.0 SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy only the project file first to leverage Docker layer caching
COPY ["Backend.csproj", "."]

# Run restore with normal verbosity to catch network errors early
RUN dotnet restore "Backend.csproj" --verbosity normal

# Copy the rest of the source code
COPY . .

# Build and publish the application
RUN dotnet publish "Backend.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final stage: Use the runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Backend.dll"]