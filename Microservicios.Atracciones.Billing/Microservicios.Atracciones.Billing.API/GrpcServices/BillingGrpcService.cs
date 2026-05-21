using Grpc.Core;
using Microservicios.Atracciones.Billing.Business.Interfaces;
using Microservicios.Atracciones.Shared.gRPC;
using BillingDto = Microservicios.Atracciones.Billing.Business.DTOs.Billing.CreateInvoiceRequest;
using BillingDetailDto = Microservicios.Atracciones.Billing.Business.DTOs.Billing.CreateInvoiceDetailRequest;

namespace Microservicios.Atracciones.Billing.API.GrpcServices;

public class BillingGrpcService : BillingService.BillingServiceBase
{
    private readonly IBillingService _billingService;
    private readonly ILogger<BillingGrpcService> _logger;

    public BillingGrpcService(IBillingService billingService, ILogger<BillingGrpcService> logger)
    {
        _billingService = billingService;
        _logger = logger;
    }

    public override async Task<CreateInvoiceGrpcReply> CreateInvoice(CreateInvoiceGrpcRequest request, ServerCallContext context)
    {
        try
        {
            if (!Guid.TryParse(request.BookingId, out var bookingId))
                return Fail("BookingId inválido.");

            if (!Guid.TryParse(request.UserId, out var userId))
                return Fail("UserId inválido.");

            var invoiceRequest = new BillingDto
            {
                BookingId = bookingId,
                UserId = userId,
                CustomerName = request.CustomerName,
                TaxId = request.TaxId,
                Email = string.IsNullOrEmpty(request.Email) ? null : request.Email,
                Address = string.IsNullOrEmpty(request.Address) ? null : request.Address,
                CurrencyCode = string.IsNullOrEmpty(request.CurrencyCode) ? "USD" : request.CurrencyCode,
                Details = request.Items.Select(i => new BillingDetailDto
                {
                    Description = i.Description,
                    Quantity = i.Quantity,
                    UnitPrice = (decimal)i.UnitPrice,
                    TaxRate = (decimal)i.TaxRate
                }).ToList()
            };

            var success = await _billingService.CrearFacturaAsync(invoiceRequest);

            return new CreateInvoiceGrpcReply
            {
                Success = success,
                InvoiceId = string.Empty,
                InvoiceNumber = string.Empty,
                ErrorMessage = success ? string.Empty : "No se pudo crear la factura."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al crear factura via gRPC para BookingId: {BookingId}", request.BookingId);
            return Fail(ex.Message);
        }
    }

    private static CreateInvoiceGrpcReply Fail(string message) =>
        new() { Success = false, ErrorMessage = message };
}
