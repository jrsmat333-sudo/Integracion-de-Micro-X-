import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-left">
        <div class="auth-left__overlay"></div>
        <div class="auth-left__content">
          <h1>Crea tu cuenta</h1>
          <p>Únete y descubre las mejores atracciones turísticas. ¡Es gratis!</p>
        </div>
      </div>

      <div class="auth-right">
        <div class="auth-form-wrapper">
          <div class="auth-brand">
            <span class="auth-brand__icon">🌊</span>
            <span class="auth-brand__name">Atracciones</span>
          </div>

          <h2>Registro</h2>
          <p class="auth-subtitle">Completa tus datos para crear una cuenta</p>

          @if (errorMessage) {
            <div class="alert alert--danger animate-fade-in">
              <span>⚠️</span> {{ errorMessage }}
            </div>
          }

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="firstName">Nombre</label>
                <input
                  id="firstName"
                  class="form-input"
                  type="text"
                  formControlName="firstName"
                  placeholder="Juan"
                />
                @if (f('firstName')?.invalid && f('firstName')?.touched) {
                  <span class="form-error">El nombre es requerido</span>
                }
              </div>

              <div class="form-group">
                <label class="form-label" for="lastName">Apellido</label>
                <input
                  id="lastName"
                  class="form-input"
                  type="text"
                  formControlName="lastName"
                  placeholder="Pérez"
                />
                @if (f('lastName')?.invalid && f('lastName')?.touched) {
                  <span class="form-error">El apellido es requerido</span>
                }
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">Correo electrónico</label>
              <input
                id="reg-email"
                class="form-input"
                type="email"
                formControlName="email"
                placeholder="tu&#64;correo.com"
                autocomplete="email"
              />
              @if (f('email')?.invalid && f('email')?.touched) {
                <span class="form-error">Ingresa un correo válido</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">Contraseña</label>
              <div class="input-password-wrapper">
                <input
                  id="reg-password"
                  class="form-input"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="Mínimo 6 caracteres"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="input-password-toggle"
                  (click)="showPassword = !showPassword"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              @if (f('password')?.hasError('minlength') && f('password')?.touched) {
                <span class="form-error">La contraseña debe tener al menos 6 caracteres</span>
              }
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="documentNumber">Nº Documento</label>
                <input
                  id="documentNumber"
                  class="form-input"
                  type="text"
                  formControlName="documentNumber"
                  placeholder="1234567890"
                />
              </div>

              <div class="form-group">
                <label class="form-label" for="phone">Teléfono</label>
                <input
                  id="phone"
                  class="form-input"
                  type="tel"
                  formControlName="phone"
                  placeholder="+593 999 999 999"
                />
              </div>
            </div>

            <button
              type="submit"
              class="btn btn--primary btn--block btn--lg"
              [disabled]="registerForm.invalid || isLoading"
            >
              @if (isLoading) {
                <span class="spinner"></span> Creando cuenta...
              } @else {
                Crear Cuenta
              }
            </button>
          </form>

          <p class="auth-footer-text">
            ¿Ya tienes una cuenta?
            <a routerLink="/auth/login" class="link-accent">Inicia sesión</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      documentNumber: [''],
      phone: ['']
    });
  }

  f(field: string): AbstractControl | null {
    return this.registerForm.get(field);
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: () => { this.isLoading = false; },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al crear la cuenta. Intenta de nuevo.';
      }
    });
  }
}
