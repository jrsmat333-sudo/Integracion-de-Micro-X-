using Mapster;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using Microservicios.Atracciones.Catalog.DataManagement.Models;

namespace Microservicios.Atracciones.Catalog.DataManagement.Mappers;

public class AttractionMapperConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<Attraction, AttractionNode>()
            .Map(dest => dest.LocationName, src => src.Location != null ? src.Location.Name : string.Empty)
            .Map(dest => dest.LocationCountryCode, src => src.Location != null ? src.Location.CountryCode : string.Empty)
            .Map(dest => dest.ImageUrl, src => src.ImageUrl);
    }
}
