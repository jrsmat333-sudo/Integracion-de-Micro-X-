using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microservicios.Atracciones.Identify.Business.DTOs.Auth;
using Microservicios.Atracciones.Identify.Business.Interfaces;

namespace Microservicios.Atracciones.Identify.API.Controllers.V1;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Iniciar sesión en el sistema y obtener un token JWT.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        return Ok(response);
    }

    /// <summary>
    /// Iniciar sesión administrativa (Solo para Admin y Partner).
    /// </summary>
    [HttpPost("login-admin")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> LoginAdmin([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAdminAsync(request);
        return Ok(response);
    }

    /// <summary>
    /// Registrar una nueva cuenta de cliente.
    /// </summary>
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return StatusCode(201, result);
    }

    /// <summary>
    /// Endpoint de prueba para verificar si el token Bearer funciona.
    /// Requiere un usuario con el rol Client.
    /// </summary>
    [HttpGet("test-client")]
    [Authorize(Roles = "Client")]
    public IActionResult TestClientAuth()
    {
        return Ok(new { message = "Tienes acceso como cliente", userId = User.Identity?.Name });
    }

    /// <summary>
    /// Endpoint de prueba para verificar si el token Bearer funciona.
    /// Permite Admin y Partner.
    /// </summary>
    [HttpGet("test-management")]
    [Authorize(Roles = "Admin,Partner")]
    public IActionResult TestManagementAuth()
    {
        return Ok(new { message = "Tienes acceso administrativo", userId = User.Identity?.Name });
    }

    /// <summary>
    /// Endpoint de prueba para verificar si el token Bearer funciona.
    /// Requiere un usuario con el rol Partner.
    /// </summary>
    [HttpGet("test-partner")]
    [Authorize(Roles = "Partner")]
    public IActionResult TestPartnerAuth()
    {
        return Ok(new { message = "Tienes acceso como partner", userId = User.Identity?.Name });
    }

    /// <summary>
    /// Actualiza la información del perfil del usuario autenticado.
    /// </summary>
    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserClaimsResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized();

        var result = await _authService.UpdateProfileAsync(userId, request);
        return Ok(result);
    }

    /// <summary>
    /// Cambia la contraseña del usuario autenticado.
    /// </summary>
    [HttpPut("change-password")]
    [Authorize]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out Guid userId))
            return Unauthorized();

        await _authService.ChangePasswordAsync(userId, request);
        return Ok(new { message = "Contraseña actualizada exitosamente." });
    }

    /// <summary>
    /// Solicita un enlace de recuperación de contraseña.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var token = await _authService.ForgotPasswordAsync(request);
        
        if (string.IsNullOrEmpty(token))
            return Ok(new { message = "Si el correo está registrado, recibirás un enlace de recuperación." });

        return Ok(new 
        { 
            message = "Si el correo está registrado, recibirás un enlace de recuperación.",
            dev_token_temporal = token 
        });
    }

    /// <summary>
    /// Restablece la contraseña usando el token de recuperación.
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        await _authService.ResetPasswordAsync(request);
        return Ok(new { message = "Contraseña restablecida exitosamente. Ya puedes iniciar sesión." });
    }
}
