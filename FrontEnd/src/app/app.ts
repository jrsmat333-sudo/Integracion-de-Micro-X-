import { Component, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { TokenService } from './core/services/token.service';
import { AuthService } from './features/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- NAVBAR PÚBLICO: se oculta en /admin y /auth -->
    <header class="main-header" *ngIf="showHeader()">
      <div class="container header-container">
        <a routerLink="/" class="logo">
          <span class="logo__brand">Tide</span>Scape
        </a>
        <nav class="main-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Inicio</a>
          <a routerLink="/catalog" routerLinkActive="active">Catálogo</a>

          <ng-container *ngIf="isLoggedIn(); else guestNav">
            <a routerLink="/my-account" routerLinkActive="active">Mi Cuenta</a>
            <a routerLink="/admin/dashboard" *ngIf="isAdmin()" class="admin-badge">⚙️ Admin</a>
            <button class="btn btn--outline btn--sm" (click)="logout()">Cerrar Sesión</button>
          </ng-container>

          <ng-template #guestNav>
            <a routerLink="/auth/login" class="btn btn--outline btn--sm">Iniciar Sesión</a>
            <a routerLink="/auth/register" class="btn btn--accent btn--sm">Registrarse</a>
          </ng-template>
        </nav>
      </div>
    </header>

    <router-outlet />
  `,
  styles: [`
    .admin-badge {
      background: rgba(212, 168, 83, 0.15);
      color: #A07D2E;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: background 0.2s ease;

      &:hover {
        background: rgba(212, 168, 83, 0.3);
        color: #856A20;
      }
    }
  `]
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);

  // Signal que emite la URL actual tras cada navegación exitosa
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  // Señales reactivas del estado de autenticación (del TokenService)
  readonly isLoggedIn = this.tokenService.isAuthenticatedSignal;
  readonly isAdmin = this.tokenService.isAdminSignal;

  // El header se muestra en todas las rutas excepto /admin y /auth
  readonly showHeader = computed(() => {
    const url = this.currentUrl() ?? '';
    return !url.startsWith('/admin') && !url.startsWith('/auth');
  });

  logout(): void {
    this.authService.logout();
  }
}
