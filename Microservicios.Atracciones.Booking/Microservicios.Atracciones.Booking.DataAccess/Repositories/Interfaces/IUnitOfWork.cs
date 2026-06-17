using Microservicios.Atracciones.Booking.DataAccess.Entities;

namespace Microservicios.Atracciones.Booking.DataAccess.Repositories.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IAvailabilitySlotRepository AvailabilitySlots { get; }
    IBookingRepository Bookings { get; }
    IBookingDetailRepository BookingDetails { get; }
    IReviewRepository Reviews { get; }
    IReviewRatingRepository ReviewRatings { get; }
    IReviewCriteriaRepository ReviewCriterias { get; }
    IReviewMediaRepository ReviewMedias { get; }

    // Idempotencia HTTP (Booking v2). Usa el repositorio genérico (PK string).
    IGenericRepository<IdempotencyKey> IdempotencyKeys { get; }

    Task<int> CompleteAsync();
}
