namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    // Geografía
    ILocationRepository Locations { get; }

    // Atracción
    IAttractionRepository Attractions { get; }

    // Modalidades
    IProductOptionRepository ProductOptions { get; }

    // Precios
    IPriceTierRepository PriceTiers { get; }

    // Ticket
    ITicketCategoryRepository TicketCategories { get; }

    Task<int> CompleteAsync();
}
