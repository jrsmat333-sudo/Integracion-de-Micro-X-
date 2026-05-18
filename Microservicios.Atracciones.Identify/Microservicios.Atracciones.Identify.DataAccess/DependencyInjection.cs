using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microservicios.Atracciones.Identify.DataAccess.Context;
using Microservicios.Atracciones.Identify.DataAccess.Queries;
using Microservicios.Atracciones.Identify.DataAccess.Repositories;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;

namespace Microservicios.Atracciones.Identify.DataAccess;

public static class DependencyInjection
{
    public static IServiceCollection AddDataAccessServices(this IServiceCollection services, IConfiguration configuration)
    {
        // ── DbContext con conexión estándar ──
        services.AddDbContext<AtraccionDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
            });
        });

        // ── Unit of Work ──
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // ── Queries (Lectura Optimizada sin Tracking) ──
        services.AddScoped<IClienteQueryRepository, ClienteQueryRepository>();

        // ── Repositorio genérico ──
        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

        return services;
    }
}
