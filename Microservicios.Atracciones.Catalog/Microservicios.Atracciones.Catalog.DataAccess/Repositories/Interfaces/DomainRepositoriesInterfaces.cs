using Microservicios.Atracciones.Catalog.DataAccess.Entities;

namespace Microservicios.Atracciones.Catalog.DataAccess.Repositories.Interfaces;

// ── Geografía ───────────────────────────────────────
public interface ILocationRepository : IGenericRepository<Location> { }

// ── Atracción ───────────────────────────────────────
public interface IAttractionRepository : IGenericRepository<Attraction>
{
    Task<Attraction?> GetAttractionWithDetailsAsync(Guid id);
}

// ── Modalidades ─────────────────────────────────────
public interface IProductOptionRepository : IGenericRepository<ProductOption> { }

// ── Precios ─────────────────────────────────────────
public interface IPriceTierRepository : IGenericRepository<PriceTier> { }

// ── Ticket ──────────────────────────────────────────
public interface ITicketCategoryRepository : IGenericRepository<TicketCategory> { }
