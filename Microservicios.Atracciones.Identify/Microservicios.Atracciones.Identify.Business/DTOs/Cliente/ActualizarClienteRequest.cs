using System.ComponentModel.DataAnnotations;

namespace Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

public class ActualizarClienteRequest
{
    [Required(ErrorMessage = "El ID es requerido.")]
    public Guid Id { get; set; }

    [Required(ErrorMessage = "El nombre es requerido.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El apellido es requerido.")]
    public string LastName { get; set; } = string.Empty;

    [Phone(ErrorMessage = "Formato de teléfono inválido.")]
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Nationality { get; set; }
    public Guid? LocationId { get; set; }
}
