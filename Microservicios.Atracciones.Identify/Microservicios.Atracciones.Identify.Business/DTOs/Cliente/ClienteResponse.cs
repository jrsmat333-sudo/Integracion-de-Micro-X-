namespace Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

public class ClienteResponse
{
    public Guid Id { get; set; }
    public string Identification { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
}
