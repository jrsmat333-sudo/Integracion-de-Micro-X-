using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Catalog.DataAccess.Context;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories;

// ── Geografía ───────────────────────────────────────
public class LocationRepository : GenericRepository<Location>, ILocationRepository
{ public LocationRepository(AtraccionDbContext context) : base(context) { } }

// ── Atracción ───────────────────────────────────────
public class AttractionRepository : GenericRepository<Attraction>, IAttractionRepository
{
    public AttractionRepository(AtraccionDbContext context) : base(context) { }

    public async Task<Attraction?> GetAttractionWithDetailsAsync(Guid id)
    {
        return await _dbSet
            .Include(a => a.Location)
            .Include(a => a.ProductOptions).ThenInclude(p => p.PriceTiers)
            .FirstOrDefaultAsync(a => a.Id == id);
    }
}

// ── Modalidades ─────────────────────────────────────
public class ProductOptionRepository : GenericRepository<ProductOption>, IProductOptionRepository
{ public ProductOptionRepository(AtraccionDbContext context) : base(context) { } }

// ── Precios ─────────────────────────────────────────
public class PriceTierRepository : GenericRepository<PriceTier>, IPriceTierRepository
{ public PriceTierRepository(AtraccionDbContext context) : base(context) { } }

// ── Ticket ──────────────────────────────────────────
public class TicketCategoryRepository : GenericRepository<TicketCategory>, ITicketCategoryRepository
{ public TicketCategoryRepository(AtraccionDbContext context) : base(context) { } }
