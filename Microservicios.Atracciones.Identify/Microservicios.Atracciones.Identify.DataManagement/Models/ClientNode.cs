namespace Microservicios.Atracciones.Identify.DataManagement.Models;

public class ClientNode
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Nationality { get; set; }
    public string? DocumentType { get; set; }
    public string? DocumentNumber { get; set; }
    public Guid? LocationId { get; set; }
    
    // Virtual expansion
    public string LocationName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
}
