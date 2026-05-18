using System.ComponentModel.DataAnnotations;

namespace Microservicios.Atracciones.Identify.Business.DTOs.User;

public class CreateUserRequest
{
    [Required(ErrorMessage = "El email es requerido.")]
    [EmailAddress(ErrorMessage = "Formato de email inválido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida.")]
    [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es requerido.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El rol es requerido.")]
    public string Role { get; set; } = "Partner"; // Admin o Partner
}

public class UserSummaryResponse
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UserSearchRequest
{
    public string? Query { get; set; }
    public string? Role { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
