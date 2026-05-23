using Microservicios.Atracciones.Identify.Business.DTOs.Cliente;
using Microservicios.Atracciones.Identify.DataManagement.Models;

namespace Microservicios.Atracciones.Identify.Business.Mappers;

public static class ClienteBusinessMapper
{
    public static ClientNode ToDataModel(this CrearClienteRequest request)
    {
        return new ClientNode
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Phone = request.Phone,
            DocumentNumber = request.Identification
        };
    }

    public static ClienteResponse ToResponse(this ClientNode dataModel)
    {
        return new ClienteResponse
        {
            Id             = dataModel.Id,
            FirstName      = dataModel.FirstName,
            LastName       = dataModel.LastName,
            FullName       = $"{dataModel.FirstName} {dataModel.LastName}",
            Email          = dataModel.UserEmail,
            Phone          = dataModel.Phone,
            BirthDate      = dataModel.BirthDate,
            LocationId     = dataModel.LocationId,
            DocumentType   = dataModel.DocumentType,
            DocumentNumber = dataModel.DocumentNumber,
        };
    }

    public static void ApplyToModel(this ActualizarClienteRequest request, ClientNode model)
    {
        model.FirstName      = request.FirstName;
        model.LastName       = request.LastName;
        model.Phone          = request.Phone;
        model.BirthDate      = request.BirthDate;
        model.Nationality    = request.Nationality;
        model.LocationId     = request.LocationId;
        if (request.DocumentType   != null) model.DocumentType   = request.DocumentType;
        if (request.DocumentNumber != null) model.DocumentNumber = request.DocumentNumber;
    }
}
