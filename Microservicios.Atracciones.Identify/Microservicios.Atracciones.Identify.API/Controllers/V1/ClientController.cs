using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microservicios.Atracciones.Identify.Business.DTOs.Cliente;
using Microservicios.Atracciones.Identify.Business.Exceptions;
using Microservicios.Atracciones.Identify.Business.Interfaces;

namespace Microservicios.Atracciones.Identify.API.Controllers.V1;

[ApiController]
[Route("api/v1/client")]
public class ClientController : ControllerBase
{
    private readonly IClienteService _clienteService;

    public ClientController(IClienteService clienteService)
    {
        _clienteService = clienteService;
    }

    /// <summary>
    /// Busca y lista clientes (Solo administradores).
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DataAccess.Common.PagedResult<ClienteResponse>>> GetClients([FromQuery] ClienteFiltroRequest request)
    {
        var result = await _clienteService.BuscarClientesAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene el detalle de un cliente por su ID.
    /// Un cliente solo puede ver su propio perfil, mientras que un Admin puede ver cualquiera.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Client")]
    public async Task<ActionResult<ClienteResponse>> GetClientById(Guid id)
    {
        ValidateUserAccess(id);
        var result = await _clienteService.ObtenerPorIdAsync(id);
        return Ok(result);
    }

    /// <summary>
    /// Valida si un cliente existe por su número de documento.
    /// Útil para el flujo de reservas y POS.
    /// </summary>
    [HttpGet("validate/{docNumber}")]
    [Authorize] // Cualquier usuario autenticado (incluyendo POS/Partners)
    public async Task<ActionResult<ClienteResponse?>> ValidateClient(string docNumber)
    {
        var result = await _clienteService.ObtenerPorDocumentoAsync(docNumber);
        return Ok(result);
    }

    /// <summary>
    /// Actualiza el perfil del cliente.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Client")]
    public async Task<ActionResult<ClienteResponse>> UpdateClient(Guid id, [FromBody] ActualizarClienteRequest request)
    {
        ValidateUserAccess(id);
        
        if (id != request.Id)
            throw new ValidationException("El ID de la ruta no coincide con el cuerpo de la petición.");

        var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _clienteService.ActualizarClienteAsync(currentUserId, request);
        return Ok(result);
    }

    /// <summary>
    /// Crea un nuevo cliente (Solo administradores).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ClienteResponse>> CreateClient([FromBody] CrearClienteRequest request)
    {
        var result = await _clienteService.RegistrarClienteAsync(request);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Elimina un cliente (Solo administradores).
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteClient(Guid id)
    {
        var success = await _clienteService.EliminarClienteAsync(id);
        if (!success) return NotFound();
        return Ok(new { message = "Cliente eliminado con éxito." });
    }

    private void ValidateUserAccess(Guid targetedUserId)
    {
        // Si no es admin, verificar que él sea dueño del ID que está consultando
        if (!User.IsInRole("Admin"))
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || Guid.Parse(userIdClaim) != targetedUserId)
            {
                throw new UnauthorizedBusinessException("Acceso denegado a la información de este cliente.");
            }
        }
    }
}
