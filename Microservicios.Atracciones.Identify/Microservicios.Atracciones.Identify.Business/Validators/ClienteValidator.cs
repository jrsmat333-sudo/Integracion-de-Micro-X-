using FluentValidation;
using Microservicios.Atracciones.Identify.Business.DTOs.Cliente;

namespace Microservicios.Atracciones.Identify.Business.Validators;

public class CrearClienteValidator : AbstractValidator<CrearClienteRequest>
{
    public CrearClienteValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("El nombre es requerido.")
            .MaximumLength(100).WithMessage("El nombre no puede exceder 100 caracteres.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("El apellido es requerido.")
            .MaximumLength(100).WithMessage("El apellido no puede exceder 100 caracteres.");

        RuleFor(x => x.Identification)
            .NotEmpty().WithMessage("La identificación es requerida.")
            .MaximumLength(50).WithMessage("La identificación no puede exceder 50 caracteres.");

        RuleFor(x => x.Email)
            .EmailAddress().When(x => !string.IsNullOrEmpty(x.Email))
            .WithMessage("El email no tiene un formato válido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña es requerida.")
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
            .Matches("[A-Z]").WithMessage("La contraseña debe contener al menos una mayúscula.")
            .Matches("[0-9]").WithMessage("La contraseña debe contener al menos un número.");
    }
}

public class ActualizarClienteValidator : AbstractValidator<ActualizarClienteRequest>
{
    public ActualizarClienteValidator()
    {
        RuleFor(x => x.Id)
            .NotEmpty().WithMessage("El ID del cliente es requerido.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("El nombre es requerido.")
            .MaximumLength(100).WithMessage("El nombre no puede exceder 100 caracteres.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("El apellido es requerido.")
            .MaximumLength(100).WithMessage("El apellido no puede exceder 100 caracteres.");

        RuleFor(x => x.Phone)
            .MaximumLength(20).WithMessage("El número de teléfono no puede exceder 20 caracteres.");

        RuleFor(x => x.Nationality)
            .MaximumLength(50).WithMessage("La nacionalidad no puede exceder 50 caracteres.");
    }
}
