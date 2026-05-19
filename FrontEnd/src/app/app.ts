import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TokenService } from './core/services/token.service';
import { AuthService } from './features/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- NAVBAR PÚBLICO -->
    <header class="main-header" *ngIf="showHeader">
      <div class="container header-container">
        <a routerLink="/" class="logo">
          <span class="logo__brand">Tide</span>Scape
        </a>
        <nav class="main-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Inicio</a>
          <a routerLink="/catalog" routerLinkActive="active">Catálogo</a>
          
          <ng-container *ngIf="isLoggedIn; else guestNav">
            <a routerLink="/my-account" routerLinkActive="active">Mi Cuenta</a>
            <a routerLink="/admin/dashboard" *ngIf="isAdmin" class="admin-badge">Admin</a>
            <button class="btn btn--outline btn--sm" (click)="logout()">Cerrar Sesión</button>
          </ng-container>
          
          <ng-template #guestNav>
            <a routerLink="/auth/login" class="btn btn--outline btn--sm">Iniciar Sesión</a>
            <a routerLink="/auth/register" class="btn btn--accent btn--sm">Registrarse</a>
          </ng-template>
        </nav>
      </div>
    </header>

    <!-- RENDER DE RUTAS -->
    <main class="app-main-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .admin-badge {
      background: rgba(212, 168, 83, 0.15);
      color: #A07D2E;
      font-size: 0.75rem;
      padding: 3px 8px;
      border-radius: var(--radius-sm);
      font-weight: 700;
      text-transform: uppercase;
      margin-right: var(--space-sm);
      
      &:hover {
        background: rgba(212, 168, 83, 0.25);
      }
    }
  `]
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);

  get showHeader(): boolean {
    const url = this.router.url;
    // Ocultar cabecera pública si estamos en rutas de administración (/admin) o de login/registro (/auth)
    return !url.startsWith('/admin') && !url.startsWith('/auth');
  }

  get isLoggedIn(): boolean {
    return this.tokenService.isAuthenticated();
  }

  get isAdmin(): boolean {
    return this.tokenService.isAdmin() || this.tokenService.hasRole('Partner');
  }

  logout(): void {
    this.authService.logout();
  }
}
