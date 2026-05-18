using Microservicios.Atracciones.Identify.DataAccess.Common;

namespace Microservicios.Atracciones.Identify.DataAccess.Entities;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? ResetPasswordToken { get; set; }
    public DateTime? ResetPasswordExpiry { get; set; }

    // Navegación
    public virtual Client? Client { get; set; }
    public virtual ICollection<UserRole> UserRoles { get; set; } = [];
}
