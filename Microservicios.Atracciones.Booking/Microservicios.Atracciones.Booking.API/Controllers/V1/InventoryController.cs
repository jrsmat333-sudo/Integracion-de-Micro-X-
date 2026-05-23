using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microservicios.Atracciones.Booking.Business.DTOs.Inventory;
using Microservicios.Atracciones.Booking.DataManagement.Interfaces;

namespace Microservicios.Atracciones.Booking.API.Controllers.V1;

/// <summary>
/// Gestión de cupos de disponibilidad. Solo accesible por administradores.
/// </summary>
[ApiController]
[Route("api/v1/inventory")]
[Authorize(Roles = "Admin")]
public class InventoryController : ControllerBase
{
    private readonly IInventoryDataService _inventoryData;

    public InventoryController(IInventoryDataService inventoryData)
    {
        _inventoryData = inventoryData;
    }

    /// <summary>
    /// Crea un nuevo slot de disponibilidad para una opción de producto.
    /// El slot quedará activo e inmediatamente visible para los clientes.
    /// </summary>
    [HttpPost("slot")]
    public async Task<ActionResult> CreateSlot([FromBody] CreateSlotRequest request)
    {
        if (request.CapacityTotal <= 0)
            return BadRequest(new { Message = "La capacidad total debe ser mayor a cero." });

        if (request.SlotDate < DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { Message = "No se pueden crear slots en fechas pasadas." });

        var slotId = await _inventoryData.CreateSlotAsync(
            request.ProductOptionId,
            request.SlotDate,
            request.StartTime,
            request.EndTime,
            request.CapacityTotal,
            request.Notes);

        return Ok(new { SlotId = slotId, Message = "Slot de disponibilidad creado correctamente." });
    }
}
