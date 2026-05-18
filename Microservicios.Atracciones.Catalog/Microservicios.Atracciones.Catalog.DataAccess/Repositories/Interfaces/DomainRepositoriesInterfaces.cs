using Microservicios.Atracciones.Catalog.DataAccess.Entities;

namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

// ── Geografía ───────────────────────────────────────
public interface ILocationRepository : IGenericRepository<Location> { }

// ── Catálogo ────────────────────────────────────────
public interface ICategoryRepository : IGenericRepository<Category> { }
public interface ISubcategoryRepository : IGenericRepository<Subcategory> { }
public interface ITagRepository : IGenericRepository<Tag> { }

// ── Atracción ───────────────────────────────────────
public interface IAttractionRepository : IGenericRepository<Attraction> 
{
    Task<Attraction?> GetAttractionWithDetailsAsync(Guid id);
}
public interface ITourItineraryRepository : IGenericRepository<TourItinerary> { }

// ── Inclusiones y Modalidades ───────────────────────
public interface IInclusionItemRepository : IGenericRepository<InclusionItem> { }
public interface IProductOptionRepository : IGenericRepository<ProductOption> { }

// ── Precios ─────────────────────────────────────────
public interface IPriceTierRepository : IGenericRepository<PriceTier> { }

// ── Otros ───────────────────────────────────────────
public interface ITicketCategoryRepository : IGenericRepository<TicketCategory> { }
public interface ITourStopRepository : IGenericRepository<TourStop> { }
