using Mapster;
using MapsterMapper;
using Microsoft.Extensions.DependencyInjection;
using Microservicios.Atracciones.Identify.DataManagement.Interfaces;
using Microservicios.Atracciones.Identify.DataManagement.Services;
using System.Reflection;

namespace Microservicios.Atracciones.Identify.DataManagement;

public static class DependencyInjection
{
    public static IServiceCollection AddDataManagementServices(this IServiceCollection services)
    {
        // 1. Configurar Mapster
        var typeAdapterConfig = TypeAdapterConfig.GlobalSettings;
        // Escanear el ensamblado actual para encontrar implementaciones de IRegister (ej: AttractionMapperConfig)
        typeAdapterConfig.Scan(Assembly.GetExecutingAssembly());
        
        services.AddSingleton(typeAdapterConfig);
        services.AddScoped<IMapper, ServiceMapper>();

        // 2. Registrar Data Services
        services.AddScoped<IClientDataService, ClientDataService>();

        return services;
    }
}
