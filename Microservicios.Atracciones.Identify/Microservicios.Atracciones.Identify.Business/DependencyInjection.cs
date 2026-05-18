using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microservicios.Atracciones.Identify.Business.Interfaces;
using Microservicios.Atracciones.Identify.Business.Services;
using Microservicios.Atracciones.Identify.Business.Validators;

namespace Microservicios.Atracciones.Identify.Business;

public static class DependencyInjection
{
    public static IServiceCollection AddBusinessServices(this IServiceCollection services)
    {
        // ─── Servicios de negocio ──────────────────────────────────────────────
        services.AddScoped<IClienteService, ClienteService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();

        // ─── Validadores FluentValidation ──────────────────────────────────────
        services.AddScoped<IValidator<DTOs.Cliente.CrearClienteRequest>, CrearClienteValidator>();
        services.AddScoped<IValidator<DTOs.Cliente.ActualizarClienteRequest>, ActualizarClienteValidator>();

        return services;
    }
}
