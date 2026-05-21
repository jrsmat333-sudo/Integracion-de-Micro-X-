using Microsoft.Extensions.DependencyInjection;
using Microservicios.Atracciones.Catalog.Business.Interfaces;
using Microservicios.Atracciones.Catalog.Business.Services;

namespace Microservicios.Atracciones.Catalog.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        services.AddScoped<IAttractionService, AttractionService>();
        services.AddScoped<ILocationService, LocationService>();
        services.AddScoped<IMasterDataService, MasterDataService>();
        services.AddScoped<IProductOptionService, ProductOptionService>();
        services.AddScoped<IStorageService, LocalStorageService>();

        return services;
    }
}
