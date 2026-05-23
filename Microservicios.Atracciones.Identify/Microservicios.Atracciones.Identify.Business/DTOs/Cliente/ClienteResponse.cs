namespace Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

public class ClienteResponse
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public Guid? LocationId { get; set; }
    public string? DocumentType { get; set; }
    public string? DocumentNumber { get; set; }
}
