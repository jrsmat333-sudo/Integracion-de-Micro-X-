namespace Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

public class ClienteFiltroRequest
{
    public string? SearchTerm { get; set; }
    public string? DocumentNumber { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
