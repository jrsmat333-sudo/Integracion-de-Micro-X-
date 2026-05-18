using System.ComponentModel.DataAnnotations;

namespace Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

public class CrearClienteRequest
{
    [Required(ErrorMessage = "La identificación es requerida.")]
    public string Identification { get; set; } = string.Empty;

    [Required(ErrorMessage = "El nombre es requerido.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El apellido es requerido.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El email es requerido.")]
    [EmailAddress(ErrorMessage = "Formato de email inválido.")]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Formato de teléfono inválido.")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "La contraseña es requerida.")]
    [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres.")]
    public string Password { get; set; } = string.Empty;
}
