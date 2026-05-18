using Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

namespace Microservicios.Atracciones.Identify.Business.Interfaces;

public interface IClienteService
{
    Task<ClienteResponse> RegistrarClienteAsync(CrearClienteRequest request);
    Task<ClienteResponse> ObtenerPorIdAsync(Guid id);
    Task<ClienteResponse?> ObtenerPorDocumentoAsync(string docNumber);
    Task<ClienteResponse> ActualizarClienteAsync(Guid userId, ActualizarClienteRequest request);
    Task<DataAccess.Common.PagedResult<ClienteResponse>> BuscarClientesAsync(ClienteFiltroRequest request);
    Task<bool> EliminarClienteAsync(Guid id);
}
