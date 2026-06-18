namespace Microservicios.Atracciones.Billing.DataAccess.Entities;

/// <summary>
/// Registro de idempotencia de mensajería: guarda el <c>MessageId</c> de cada evento ya
/// procesado por un consumer. Si el mismo mensaje se reentrega (at-least-once delivery de
/// RabbitMQ), el consumer detecta que ya existe y lo ignora, evitando facturas duplicadas.
///
/// NOTA: la tabla se crea MANUALMENTE en la BD de Billing (Supabase), sin migración EF.
/// El BillingDbContext aplica convención snake_case a las columnas, por lo que el script
/// SQL usa: processed_events(message_id, consumer_type, processed_at_utc).
/// </summary>
public class ProcessedEvent
{
    /// <summary>MessageId del mensaje de MassTransit. Clave primaria.</summary>
    public Guid MessageId { get; set; }

    /// <summary>Nombre del consumer que procesó el mensaje (para trazabilidad).</summary>
    public string ConsumerType { get; set; } = string.Empty;

    /// <summary>Fecha/hora UTC en que se procesó.</summary>
    public DateTime ProcessedAtUtc { get; set; }
}
