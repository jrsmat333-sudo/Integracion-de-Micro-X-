using Microservicios.Atracciones.Identify.DataAccess.Common;

namespace Microservicios.Atracciones.Identify.DataAccess.Entities;

public class Client : BaseEntity
{
    public Guid? UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateOnly? BirthDate { get; set; }
    public string? Nationality { get; set; }
    public string? DocumentType { get; set; }       // "passport" | "dni" | "ruc"
    public string? DocumentNumber { get; set; }
    public Guid? LocationId { get; set; }

    /// <summary>Nombre completo calculado (no mapeado).</summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    // Navegación
    public virtual User? User { get; set; }
}
