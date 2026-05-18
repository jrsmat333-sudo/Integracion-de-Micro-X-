FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar los archivos de proyecto
COPY ["Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.API/Microservicios.Atracciones.Identify.API.csproj", "Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.API/"]
COPY ["Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.Business/Microservicios.Atracciones.Identify.Business.csproj", "Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.Business/"]
COPY ["Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.DataAccess/Microservicios.Atracciones.Identify.DataAccess.csproj", "Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.DataAccess/"]
COPY ["Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.DataManagement/Microservicios.Atracciones.Identify.DataManagement.csproj", "Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.DataManagement/"]

# Restaurar dependencias
RUN dotnet restore "Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.API/Microservicios.Atracciones.Identify.API.csproj"

# Copiar todo el código
COPY . .
WORKDIR "/src/Microservicios.Atracciones.Identify/Microservicios.Atracciones.Identify.API"
RUN dotnet build "Microservicios.Atracciones.Identify.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Microservicios.Atracciones.Identify.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Microservicios.Atracciones.Identify.API.dll"]
