import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TokenService } from '../../../core/services/token.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-container">
      <!-- SIDEBAR -->
      <aside class="admin-sidebar">
        <div class="admin-brand">
          <span class="icon">🌊</span>
          <span class="name">TideScape Admin</span>
        </div>

        <nav class="admin-nav">
          <p class="nav-heading">Principal</p>
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <span class="icon">📊</span> Dashboard
          </a>
          
          <p class="nav-heading">Catálogo</p>
          <a routerLink="/admin/attractions" routerLinkActive="active" class="nav-item">
            <span class="icon">🏝️</span> Atracciones
          </a>
          <a routerLink="/admin/catalog-setup" routerLinkActive="active" class="nav-item">
            <span class="icon">⚙️</span> Configuración
          </a>

          <p class="nav-heading">Operaciones</p>
          <a routerLink="/admin/inventory" routerLinkActive="active" class="nav-item">
            <span class="icon">📅</span> Inventario / Slots
          </a>
          <a routerLink="/admin/bookings" routerLinkActive="active" class="nav-item">
            <span class="icon">🎫</span> Reservas
          </a>
          <a routerLink="/admin/billing" routerLinkActive="active" class="nav-item">
            <span class="icon">🧾</span> Facturación
          </a>
        </nav>

        <div class="admin-footer">
          <button class="btn btn--outline btn--block btn--sm" (click)="logout()">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="admin-main">
        <header class="admin-topbar">
          <div class="page-title">
            <!-- Título dinámico se podría manejar con un servicio -->
            <h2>Panel de Control</h2>
          </div>
          <div class="user-profile">
            <span class="role-badge">{{ userRole }}</span>
            <span class="user-email">{{ userEmail }}</span>
          </div>
        </header>

        <div class="admin-content-area">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
  private tokenService = inject(TokenService);
  private router = inject(Router);

  userEmail = '';
  userRole = '';

  constructor() {
    const decoded = this.tokenService.getDecodedToken();
    if (decoded) {
      this.userEmail = decoded.email;
      this.userRole = this.tokenService.isAdmin() ? 'Administrador' : 'Partner';
    }
  }

  logout() {
    this.tokenService.removeToken();
    this.router.navigate(['/auth/login']);
  }
}
