FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copiar los archivos de proyecto
COPY ["Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.API/Microservicios.Atracciones.Booking.API.csproj", "Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.API/"]
COPY ["Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.Business/Microservicios.Atracciones.Booking.Business.csproj", "Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.Business/"]
COPY ["Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.DataAccess/Microservicios.Atracciones.Booking.DataAccess.csproj", "Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.DataAccess/"]
COPY ["Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.DataManagement/Microservicios.Atracciones.Booking.DataManagement.csproj", "Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.DataManagement/"]
COPY ["Microservicios.Atracciones.Shared.gRPC/Microservicios.Atracciones.Shared.gRPC.csproj", "Microservicios.Atracciones.Shared.gRPC/"]

# Restaurar dependencias
RUN dotnet restore "Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.API/Microservicios.Atracciones.Booking.API.csproj"

# Copiar todo el código
COPY . .
WORKDIR "/src/Microservicios.Atracciones.Booking/Microservicios.Atracciones.Booking.API"
RUN dotnet build "Microservicios.Atracciones.Booking.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Microservicios.Atracciones.Booking.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Microservicios.Atracciones.Booking.API.dll"]
