using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microservicios.Atracciones.Identify.Business.DTOs.User;
using Microservicios.Atracciones.Identify.Business.Interfaces;

namespace Microservicios.Atracciones.Identify.API.Controllers.V1;

[ApiController]
[Route("api/v1/user")]
[Authorize(Roles = "Admin")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult> GetUsers([FromQuery] UserSearchRequest request)
    {
        var result = await _userService.GetUsersAsync(request);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        var result = await _userService.CreateUserAsync(request);
        return CreatedAtAction(nameof(GetUsers), new { id = result.Id }, result);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] bool isActive)
    {
        var result = await _userService.UpdateStatusAsync(id, isActive);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteUser(Guid id)
    {
        var result = await _userService.DeleteUserAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }
}
