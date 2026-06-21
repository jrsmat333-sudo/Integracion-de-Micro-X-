using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microservicios.Atracciones.Gateway.API.Realtime;
using Microservicios.Atracciones.Shared.Contracts.Events;

namespace Microservicios.Atracciones.Gateway.API.Consumers;

/// <summary>
/// Consume <see cref="AttractionCreatedEvent"/> (publicado por Catalog) y hace BROADCAST por
/// SignalR a todos los clientes conectados, para que la app móvil muestre la nueva atracción
/// sin recargar.
/// </summary>
public class AttractionCreatedConsumer : IConsumer<AttractionCreatedEvent>
{
    private readonly IHubContext<NotificationsHub> _hub;
    private readonly ILogger<AttractionCreatedConsumer> _logger;

    public AttractionCreatedConsumer(IHubContext<NotificationsHub> hub, ILogger<AttractionCreatedConsumer> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<AttractionCreatedEvent> context)
    {
        var m = context.Message;

        await _hub.Clients.All.SendAsync("OnAttractionCreated", new
        {
            m.AttractionId,
            m.Name,
            m.LocationName,
            m.ImageUrl,
            m.StartingPrice,
            m.Slug
        }, context.CancellationToken);

        _logger.LogInformation("OnAttractionCreated (broadcast) AttractionId={AttractionId}", m.AttractionId);
    }
}
