using Microservicios.Atracciones.Identify.Business.Interfaces;
using Microservicios.Atracciones.Identify.Business.DTOs.Cliente;
using Microservicios.Atracciones.Identify.Business.Mappers;
using Microservicios.Atracciones.Identify.Business.Exceptions;
using Microservicios.Atracciones.Identify.DataManagement.Interfaces;
using Microservicios.Atracciones.Identify.DataAccess.Repositories.Interfaces;
using Microservicios.Atracciones.Identify.DataAccess.Entities;
using Microsoft.EntityFrameworkCore;
using BCryptNet = BCrypt.Net.BCrypt;

namespace Microservicios.Atracciones.Identify.Business.Services;

public class ClienteService : IClienteService
{
    private readonly IClientDataService _clientDataService;
    private readonly IUnitOfWork _unitOfWork;

    public ClienteService(IClientDataService clientDataService, IUnitOfWork unitOfWork)
    {
        _clientDataService = clientDataService;
        _unitOfWork = unitOfWork;
    }

    public async Task<ClienteResponse> RegistrarClienteAsync(CrearClienteRequest request)
    {
        // 1. Validar si ya existe el usuario por Email
        var emailExists = await _unitOfWork.Users.Query()
            .AnyAsync(u => u.Email == request.Email);
        
        if (emailExists)
            throw new ConflictException("El email ya está registrado.");

        // 2. Validar si ya existe el cliente por Identificación
        var identificationExists = await _unitOfWork.Clients.Query()
            .AnyAsync(c => c.DocumentNumber == request.Identification);

        if (identificationExists)
            throw new ConflictException("La identificación ya está registrada.");

        // 3. Obtener Rol de Cliente
        var clientRole = await _unitOfWork.Roles.Query()
            .FirstOrDefaultAsync(r => r.Name == "Client");

        if (clientRole == null)
            throw new BusinessException("No se encontró el rol de cliente en el sistema.");

        // 4. Crear Usuario y Cliente vinculados
        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email!,
            PasswordHash = BCryptNet.HashPassword(request.Password),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            UserRoles = new List<UserRole> { new UserRole { RoleId = clientRole.Id } },
            Client = new Client
            {
                Id = Guid.NewGuid(),
                FirstName = request.FirstName,
                LastName = request.LastName,
                Phone = request.Phone,
                DocumentNumber = request.Identification,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };

        // 5. Guardar en una sola transacción
        await _unitOfWork.Users.AddAsync(newUser);
        await _unitOfWork.CompleteAsync();

        // 6. Consultar los datos creados para el Mapping de respuesta
        var createdClient = await _clientDataService.GetByIdAsync(newUser.Client.Id);
        return createdClient!.ToResponse();
    }

    public async Task<ClienteResponse> ObtenerPorIdAsync(Guid id)
    {
        var dataModel = await _clientDataService.GetByIdAsync(id);

        if (dataModel == null)
            throw new NotFoundException("Cliente", id);

        return dataModel.ToResponse();
    }

    public async Task<ClienteResponse?> ObtenerPorDocumentoAsync(string docNumber)
    {
        var dataModel = await _clientDataService.GetByDocumentNumberAsync(docNumber);
        return dataModel?.ToResponse();
    }

    public async Task<ClienteResponse> ActualizarClienteAsync(Guid userId, ActualizarClienteRequest request)
    {
        if (userId != request.Id)
            throw new UnauthorizedBusinessException("No tienes permiso para actualizar este perfil de cliente.");

        var dataModel = await _clientDataService.GetByIdAsync(request.Id);
        if (dataModel == null)
            throw new NotFoundException("Cliente", request.Id);

        request.ApplyToModel(dataModel);

        var success = await _clientDataService.UpdateAsync(dataModel);
        if (!success)
            throw new BusinessException("No se pudo actualizar el perfil del cliente.");

        var updatedModel = await _clientDataService.GetByIdAsync(request.Id);
        return updatedModel!.ToResponse();
    }

    public async Task<DataAccess.Common.PagedResult<ClienteResponse>> BuscarClientesAsync(ClienteFiltroRequest request)
    {
        var filters = new DataAccess.Common.QueryFilters
        {
            SearchTerm = request.SearchTerm ?? string.Empty,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
        
        // This is a basic filter mapping, more complex filtering could be applied inside DataManagement
        var paged = await _clientDataService.SearchAsync(filters);

        return new DataAccess.Common.PagedResult<ClienteResponse>
        {
            Items = paged.Items.Select(c => c.ToResponse()).ToList(),
            TotalCount = paged.TotalCount,
            PageNumber = paged.PageNumber,
            PageSize = paged.PageSize
        };
    }

    public async Task<bool> EliminarClienteAsync(Guid id)
    {
        var dataModel = await _clientDataService.GetByIdAsync(id);
        if (dataModel == null)
            throw new NotFoundException("Cliente", id);

        return await _clientDataService.DeleteAsync(id);
    }
}
