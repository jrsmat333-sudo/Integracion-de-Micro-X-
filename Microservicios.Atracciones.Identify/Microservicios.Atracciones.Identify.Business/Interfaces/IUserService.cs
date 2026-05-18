using Microservicios.Atracciones.Identify.Business.DTOs.User;
using Microservicios.Atracciones.Identify.DataAccess.Common;

namespace Microservicios.Atracciones.Identify.Business.Interfaces;

public interface IUserService
{
    Task<UserSummaryResponse> CreateUserAsync(CreateUserRequest request);
    Task<PagedResult<UserSummaryResponse>> GetUsersAsync(UserSearchRequest request);
    Task<bool> UpdateStatusAsync(Guid id, bool isActive);
    Task<bool> DeleteUserAsync(Guid id);
}
