using Microservicios.Atracciones.Identify.DataAccess.Common;
using Microservicios.Atracciones.Identify.DataAccess.Entities;

namespace Microservicios.Atracciones.Identify.DataAccess.Queries;

public interface IClienteQueryRepository
{
    // Obtener un listado paginado y filtrado de clientes
    Task<PagedResult<Client>> ObtenerClientesPaginadosAsync(QueryFilters filtros);

    // Obtener el perfil completo de un cliente incluyendo datos de su usuario
    Task<Client?> ObtenerPerfilClienteAsync(Guid clienteId);

    // Verificar si ya existe una identificación para evitar duplicados en UI
    Task<bool> ExisteIdentificacionAsync(string identificacion);
}
