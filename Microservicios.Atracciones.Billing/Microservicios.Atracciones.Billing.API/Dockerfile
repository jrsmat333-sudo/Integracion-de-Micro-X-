FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar los archivos de proyecto
COPY ["Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.API/Microservicios.Atracciones.Billing.API.csproj", "Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.API/"]
COPY ["Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.Business/Microservicios.Atracciones.Billing.Business.csproj", "Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.Business/"]
COPY ["Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.DataAccess/Microservicios.Atracciones.Billing.DataAccess.csproj", "Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.DataAccess/"]
COPY ["Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.DataManagement/Microservicios.Atracciones.Billing.DataManagement.csproj", "Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.DataManagement/"]

# Restaurar dependencias
RUN dotnet restore "Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.API/Microservicios.Atracciones.Billing.API.csproj"

# Copiar todo el código
COPY . .
WORKDIR "/src/Microservicios.Atracciones.Billing/Microservicios.Atracciones.Billing.API"
RUN dotnet build "Microservicios.Atracciones.Billing.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Microservicios.Atracciones.Billing.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Microservicios.Atracciones.Billing.API.dll"]
