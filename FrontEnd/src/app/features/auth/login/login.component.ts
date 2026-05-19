import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-left">
        <div class="auth-left__overlay"></div>
        <div class="auth-left__content">
          <h1>Bienvenido de vuelta</h1>
          <p>Accede a las mejores experiencias turísticas del mundo.</p>
        </div>
      </div>

      <div class="auth-right">
        <div class="auth-form-wrapper">
          <div class="auth-brand">
            <span class="auth-brand__icon">🌊</span>
            <span class="auth-brand__name">Atracciones</span>
          </div>

          <h2>Iniciar Sesión</h2>
          <p class="auth-subtitle">Ingresa tus credenciales para continuar</p>

          @if (errorMessage) {
            <div class="alert alert--danger animate-fade-in">
              <span>⚠️</span> {{ errorMessage }}
            </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="form-group">
              <label class="form-label" for="email">Correo electrónico</label>
              <input
                id="email"
                class="form-input"
                type="email"
                formControlName="email"
                placeholder="tu&#64;correo.com"
                autocomplete="email"
              />
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <span class="form-error">Ingresa un correo válido</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <div class="input-password-wrapper">
                <input
                  id="password"
                  class="form-input"
                  [type]="showPassword ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="input-password-toggle"
                  (click)="showPassword = !showPassword"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <span class="form-error">La contraseña es requerida</span>
              }
            </div>

            <div class="form-actions">
              <a routerLink="/auth/forgot-password" class="link-forgot">¿Olvidaste tu contraseña?</a>
            </div>

            <button
              type="submit"
              class="btn btn--primary btn--block btn--lg"
              [disabled]="loginForm.invalid || isLoading"
            >
              @if (isLoading) {
                <span class="spinner"></span> Ingresando...
              } @else {
                Iniciar Sesión
              }
            </button>
          </form>

          <p class="auth-footer-text">
            ¿No tienes una cuenta?
            <a routerLink="/auth/register" class="link-accent">Regístrate aquí</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => { this.isLoading = false; },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Credenciales inválidas. Intenta de nuevo.';
      }
    });
  }
}
