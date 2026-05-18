using Microsoft.EntityFrameworkCore;
using Microservicios.Atracciones.Catalog.DataAccess.Context;
using Microservicios.Atracciones.Catalog.DataAccess.Entities;
using Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories;

// ── Geografía ───────────────────────────────────────
public class LocationRepository : GenericRepository<Location>, ILocationRepository 
{ public LocationRepository(AtraccionDbContext context) : base(context) { } }

// ── Catálogo ────────────────────────────────────────
public class CategoryRepository : GenericRepository<Category>, ICategoryRepository 
{ public CategoryRepository(AtraccionDbContext context) : base(context) { } }

public class SubcategoryRepository : GenericRepository<Subcategory>, ISubcategoryRepository 
{ public SubcategoryRepository(AtraccionDbContext context) : base(context) { } }

public class TagRepository : GenericRepository<Tag>, ITagRepository 
{ public TagRepository(AtraccionDbContext context) : base(context) { } }

// ── Atracción ───────────────────────────────────────
public class AttractionRepository : GenericRepository<Attraction>, IAttractionRepository 
{
    public AttractionRepository(AtraccionDbContext context) : base(context) { }

    public async Task<Attraction?> GetAttractionWithDetailsAsync(Guid id)
    {
        return await _dbSet
            .Include(a => a.Media)
            .Include(a => a.Subcategory)
            .ThenInclude(s => s.Category)
            .Include(a => a.Tags).ThenInclude(t => t.Tag)
            .Include(a => a.Inclusions).ThenInclude(i => i.InclusionItem)
            .FirstOrDefaultAsync(a => a.Id == id);
    }
}

public class TourItineraryRepository : GenericRepository<TourItinerary>, ITourItineraryRepository 
{ public TourItineraryRepository(AtraccionDbContext context) : base(context) { } }

// ── Inclusiones y Modalidades ───────────────────────
public class InclusionItemRepository : GenericRepository<InclusionItem>, IInclusionItemRepository 
{ public InclusionItemRepository(AtraccionDbContext context) : base(context) { } }

public class ProductOptionRepository : GenericRepository<ProductOption>, IProductOptionRepository 
{ public ProductOptionRepository(AtraccionDbContext context) : base(context) { } }

// ── Precios ─────────────────────────────────────────
public class PriceTierRepository : GenericRepository<PriceTier>, IPriceTierRepository 
{ public PriceTierRepository(AtraccionDbContext context) : base(context) { } }

// ── Otros ───────────────────────────────────────────
public class TicketCategoryRepository : GenericRepository<TicketCategory>, ITicketCategoryRepository
{ public TicketCategoryRepository(AtraccionDbContext context) : base(context) { } }

public class TourStopRepository : GenericRepository<TourStop>, ITourStopRepository
{ public TourStopRepository(AtraccionDbContext context) : base(context) { } }
