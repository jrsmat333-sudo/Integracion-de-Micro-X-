using Microservicios.Atracciones.Catalog.DataAccess.Context;
using Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AtraccionDbContext _context;

    public UnitOfWork(AtraccionDbContext context)
    {
        _context = context;
    }

    // Geografía
    private ILocationRepository? _locations;
    public ILocationRepository Locations => _locations ??= new LocationRepository(_context);

    // Atracción
    private IAttractionRepository? _attractions;
    public IAttractionRepository Attractions => _attractions ??= new AttractionRepository(_context);

    // Modalidades
    private IProductOptionRepository? _productOptions;
    public IProductOptionRepository ProductOptions => _productOptions ??= new ProductOptionRepository(_context);

    // Precios
    private IPriceTierRepository? _priceTiers;
    public IPriceTierRepository PriceTiers => _priceTiers ??= new PriceTierRepository(_context);

    // Ticket
    private ITicketCategoryRepository? _ticketCategories;
    public ITicketCategoryRepository TicketCategories => _ticketCategories ??= new TicketCategoryRepository(_context);

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
