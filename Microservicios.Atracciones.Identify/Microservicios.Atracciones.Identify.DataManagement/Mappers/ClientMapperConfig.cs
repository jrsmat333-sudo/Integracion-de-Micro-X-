using Mapster;
using Microservicios.Atracciones.Identify.DataAccess.Entities;
using Microservicios.Atracciones.Identify.DataManagement.Models;

namespace Microservicios.Atracciones.Identify.DataManagement.Mappers;

public class ClientMapperConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Client, ClientNode>()
            .Map(dest => dest.UserEmail, src => src.User != null ? src.User.Email : string.Empty)
            .Map(dest => dest.BirthDate, src => src.BirthDate.HasValue ? src.BirthDate.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null);
            
        config.NewConfig<ClientNode, Client>()
            .Ignore(dest => dest.User!)
            .Ignore(dest => dest.CreatedAt!)
            .Ignore(dest => dest.UpdatedAt!)
            .Map(dest => dest.BirthDate, src => src.BirthDate.HasValue ? DateOnly.FromDateTime(src.BirthDate.Value) : (DateOnly?)null)
            .Ignore(dest => dest.Id); // Generalmente no sobreescribimos el Id en un mapeo hacia DTO
    }
}
