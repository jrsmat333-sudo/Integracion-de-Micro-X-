FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar los archivos de proyecto
COPY ["Microservicios.Atracciones.Gateway.API/Microservicios.Atracciones.Gateway.API.csproj", "Microservicios.Atracciones.Gateway.API/"]

# Restaurar dependencias
RUN dotnet restore "Microservicios.Atracciones.Gateway.API/Microservicios.Atracciones.Gateway.API.csproj"

# Copiar todo el código
COPY . .
WORKDIR "/src/Microservicios.Atracciones.Gateway.API"
RUN dotnet build "Microservicios.Atracciones.Gateway.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Microservicios.Atracciones.Gateway.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Microservicios.Atracciones.Gateway.API.dll"]
