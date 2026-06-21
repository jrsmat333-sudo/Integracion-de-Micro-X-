namespace Microservicios.Atracciones.Shared.Contracts.Events;

/// <summary>
/// Evento publicado por Catalog (fire-and-forget) cuando un admin crea una atracción.
/// El Gateway lo consume en Fase 3 y hace broadcast por SignalR (<c>OnAttractionCreated</c>)
/// para que la app móvil muestre la nueva atracción sin recargar.
///
/// Es un "ping" de tiempo real: trae lo justo para pintar la tarjeta; la app usa
/// <paramref name="Slug"/> para pedir el detalle completo por GraphQL si lo necesita.
/// </summary>
/// <param name="AttractionId">Id de la atracción creada.</param>
/// <param name="Name">Nombre de la atracción.</param>
/// <param name="LocationName">Ubicación (puede ir vacía; la app puede resolverla por el detalle).</param>
/// <param name="ImageUrl">URL de la imagen principal (si la hay).</param>
/// <param name="StartingPrice">Precio mínimo (0 si la atracción se creó sin modalidades aún).</param>
/// <param name="Slug">Slug único para navegar al detalle.</param>
/// <param name="OccurredOnUtc">Momento de creación (UTC).</param>
public record AttractionCreatedEvent(
    Guid AttractionId,
    string Name,
    string? LocationName,
    string? ImageUrl,
    decimal StartingPrice,
    string Slug,
    DateTime OccurredOnUtc);
