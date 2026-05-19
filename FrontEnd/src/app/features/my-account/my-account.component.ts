import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TokenService } from '../../core/services/token.service';
import { BookingService } from '../booking/services/booking.service';
import { BillingService } from './services/billing.service';
import { BookingSummary } from '../../shared/models/booking.model';
import { InvoiceSummary } from '../../shared/models/billing.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="account-page pb-5">
      <!-- HEADER -->
      <section class="account-header">
        <div class="container">
          <div class="account-profile">
            <div class="account-avatar">{{ userInitial }}</div>
            <div class="account-info">
              <h1>Hola, {{ userEmail }}</h1>
              <p class="text-muted">Gestiona tus reservas y facturas</p>
            </div>
            <button class="btn btn--outline ml-auto" (click)="logout()">Cerrar Sesión</button>
          </div>
        </div>
      </section>

      <!-- CONTENT -->
      <section class="container mt-4">
        <div class="account-layout grid">
          
          <!-- MENU LATERAL -->
          <aside class="account-sidebar">
            <nav class="account-nav card">
              <button class="nav-item" [class.active]="activeTab === 'bookings'" (click)="activeTab = 'bookings'">
                <span class="icon">🎟️</span> Mis Reservas
              </button>
              <button class="nav-item" [class.active]="activeTab === 'invoices'" (click)="activeTab = 'invoices'">
                <span class="icon">🧾</span> Mis Facturas
              </button>
              <button class="nav-item" [class.active]="activeTab === 'profile'" (click)="activeTab = 'profile'">
                <span class="icon">👤</span> Mi Perfil
              </button>
            </nav>
          </aside>

          <!-- TAB CONTENT -->
          <main class="account-content">
            
            @if (isLoading) {
              <div class="card p-4 text-center">
                <span class="spinner spinner--primary"></span> Cargando información...
              </div>
            } @else {
              
              <!-- MIS RESERVAS -->
              @if (activeTab === 'bookings') {
                <div class="card p-4 animate-fade-in">
                  <h2 class="mb-4">Mis Reservas</h2>
                  
                  @if (bookings.length === 0) {
                    <div class="empty-state text-center">
                      <p class="text-muted">Aún no tienes reservas.</p>
                    </div>
                  } @else {
                    <div class="list-group">
                      @for (booking of bookings; track booking.id) {
                        <div class="list-item flex-between">
                          <div>
                            <div class="text-sm text-muted mb-1">PNR: {{ booking.pnrCode }} | Fecha: {{ booking.activityDate | date }}</div>
                            <h4 class="mb-1">{{ booking.attractionName || 'Atracción' }}</h4>
                            <span class="badge" 
                                  [class.badge--success]="booking.statusName === 'Confirmed'"
                                  [class.badge--danger]="booking.statusName === 'Cancelled'"
                                  [class.badge--info]="booking.statusName === 'Pending'">
                              {{ booking.statusName }}
                            </span>
                          </div>
                          <div class="text-right">
                            <strong class="text-lg d-block">{{ booking.totalAmount | currency:booking.currencyCode }}</strong>
                            @if (booking.statusName !== 'Cancelled') {
                              <button class="btn btn--outline btn--sm mt-2" (click)="cancelBooking(booking.id)">Cancelar</button>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              }

              <!-- MIS FACTURAS -->
              @if (activeTab === 'invoices') {
                <div class="card p-4 animate-fade-in">
                  <h2 class="mb-4">Mis Facturas</h2>
                  
                  @if (invoices.length === 0) {
                    <div class="empty-state text-center">
                      <p class="text-muted">Aún no tienes facturas generadas.</p>
                    </div>
                  } @else {
                    <div class="table-responsive">
                      <table class="table">
                        <thead>
                          <tr>
                            <th>Número</th>
                            <th>Fecha</th>
                            <th>Total</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (invoice of invoices; track invoice.id) {
                            <tr>
                              <td><strong>{{ invoice.invoiceNumber }}</strong></td>
                              <td>{{ invoice.createdAt | date }}</td>
                              <td>{{ invoice.total | currency:invoice.currencyCode }}</td>
                              <td><button class="btn btn--outline btn--sm">Ver Detalle</button></td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              }

              <!-- MI PERFIL -->
              @if (activeTab === 'profile') {
                <div class="card p-4 animate-fade-in">
                  <h2 class="mb-4">Información Personal</h2>
                  <p class="text-muted">Tu información base. Para editarla debes contactar a soporte.</p>
                  
                  <div class="form-group mt-4">
                    <label class="form-label">Email de la cuenta</label>
                    <input type="text" class="form-input" [value]="userEmail" disabled>
                  </div>
                  <div class="form-group">
                    <label class="form-label">ID de Usuario</label>
                    <input type="text" class="form-input" [value]="userId" disabled>
                  </div>
                </div>
              }
            }
          </main>
        </div>
      </section>
    </div>
  `,
  styleUrl: './my-account.component.scss'
})
export class MyAccountComponent implements OnInit {
  private tokenService = inject(TokenService);
  private bookingService = inject(BookingService);
  private billingService = inject(BillingService);
  private router = inject(Router);

  activeTab: 'bookings' | 'invoices' | 'profile' = 'bookings';
  isLoading = false;
  
  userId = '';
  userEmail = '';
  userInitial = '';

  bookings: BookingSummary[] = [];
  invoices: InvoiceSummary[] = [];

  ngOnInit() {
    const payload = this.tokenService.getDecodedToken();
    if (payload) {
      this.userId = payload.sub;
      this.userEmail = payload.email || 'Usuario';
      this.userInitial = this.userEmail.charAt(0).toUpperCase();
    }
    
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    
    // Para simplificar, hacemos las llamadas en paralelo. Si una falla, no bloquea toda la UI severamente (en un escenario real usaríamos forkJoin/catchError)
    this.bookingService.getMyBookings().subscribe({
      next: (res) => { this.bookings = res.data; this.isLoading = false; },
      error: () => { this.isLoading = false; }
    });

    this.billingService.getMyInvoices().subscribe({
      next: (res) => { this.invoices = res.data; },
      error: () => {}
    });
  }

  cancelBooking(id: string) {
    if (confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      this.bookingService.cancelBooking(id, 'Cancelación por usuario').subscribe({
        next: () => {
          alert('Reserva cancelada exitosamente.');
          this.loadData(); // Recargar
        },
        error: () => alert('Error al cancelar la reserva.')
      });
    }
  }

  logout() {
    this.tokenService.removeToken();
    this.router.navigate(['/auth/login']);
  }
}
