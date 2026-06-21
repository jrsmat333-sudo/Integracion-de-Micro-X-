FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080


FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar los archivos de proyecto
COPY ["Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.API/Microservicios.Atracciones.Catalog.API.csproj", "Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.API/"]
COPY ["Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.Business/Microservicios.Atracciones.Catalog.Business.csproj", "Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.Business/"]
COPY ["Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.DataAccess/Microservicios.Atracciones.Catalog.DataAccess.csproj", "Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.DataAccess/"]
COPY ["Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.DataManagement/Microservicios.Atracciones.Catalog.DataManagement.csproj", "Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.DataManagement/"]
COPY ["Microservicios.Atracciones.Shared.gRPC/Microservicios.Atracciones.Shared.gRPC.csproj", "Microservicios.Atracciones.Shared.gRPC/"]
COPY ["Microservicios.Atracciones.Shared.Contracts/Microservicios.Atracciones.Shared.Contracts.csproj", "Microservicios.Atracciones.Shared.Contracts/"]

# Restaurar dependencias
RUN dotnet restore "Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.API/Microservicios.Atracciones.Catalog.API.csproj"

# Copiar todo el código
COPY . .
WORKDIR "/src/Microservicios.Atracciones.Catalog/Microservicios.Atracciones.Catalog.API"
RUN dotnet build "Microservicios.Atracciones.Catalog.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Microservicios.Atracciones.Catalog.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Microservicios.Atracciones.Catalog.API.dll"]
