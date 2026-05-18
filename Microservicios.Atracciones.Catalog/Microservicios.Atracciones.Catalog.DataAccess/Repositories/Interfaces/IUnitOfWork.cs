namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    // Geografía
    ILocationRepository Locations { get; }

    // Catálogo
    ICategoryRepository Categories { get; }
    ISubcategoryRepository Subcategories { get; }
    ITagRepository Tags { get; }

    // Atracción
    IAttractionRepository Attractions { get; }
    ITourItineraryRepository TourItineraries { get; }

    // Inclusiones y Modalidades
    IInclusionItemRepository InclusionItems { get; }
    IProductOptionRepository ProductOptions { get; }

    // Precios
    IPriceTierRepository PriceTiers { get; }

    // Otros
    ITicketCategoryRepository TicketCategories { get; }
    ITourStopRepository TourStops { get; }

    Task<int> CompleteAsync();
}
