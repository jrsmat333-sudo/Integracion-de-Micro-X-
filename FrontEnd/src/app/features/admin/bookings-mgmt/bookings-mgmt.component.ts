import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../booking/services/booking.service';
import { BookingSummary } from '../../../shared/models/booking.model';

@Component({
  selector: 'app-bookings-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="page-header mb-4">
        <h1>Gestión de Reservas</h1>
        <p class="text-muted">Visualiza, audita y administra todas las reservas del sistema.</p>
      </div>

      <div class="card p-4">
        <div class="filters-bar flex-between mb-4">
          <div class="search-box">
            <input type="text" class="form-input" placeholder="Buscar por PNR..." [(ngModel)]="searchTerm" (keyup.enter)="loadBookings()">
          </div>
          <div class="filter-actions flex">
            <select class="form-input" [(ngModel)]="statusFilter" (change)="loadBookings()">
              <option value="">Todos los estados</option>
              <option value="Confirmed">Confirmadas</option>
              <option value="Pending">Pendientes</option>
              <option value="Cancelled">Canceladas</option>
            </select>
            <button class="btn btn--outline ml-2" (click)="loadBookings()">Actualizar</button>
          </div>
        </div>

        @if (isLoading) {
          <div class="text-center p-4"><span class="spinner spinner--primary"></span></div>
        } @else {
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>Atracción</th>
                  <th>Fecha</th>
                  <th>Monto Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (booking of bookings; track booking.id) {
                  <tr>
                    <td><strong>{{ booking.pnrCode }}</strong></td>
                    <td>{{ booking.attractionName || 'N/A' }}</td>
                    <td>{{ booking.activityDate | date:'mediumDate' }}</td>
                    <td>{{ booking.totalAmount | currency:booking.currencyCode }}</td>
                    <td>
                      <span class="badge" 
                            [class.badge--success]="booking.statusName === 'Confirmed'"
                            [class.badge--danger]="booking.statusName === 'Cancelled'"
                            [class.badge--info]="booking.statusName === 'Pending'">
                        {{ booking.statusName }}
                      </span>
                    </td>
                    <td>
                      <button class="btn-action" title="Ver Detalle">👁️</button>
                      @if (booking.statusName !== 'Cancelled') {
                        <button class="btn-action" title="Cancelar Reserva" (click)="cancelBooking(booking)">🚫</button>
                      }
                    </td>
                  </tr>
                }
                @if (bookings.length === 0) {
                  <tr><td colspan="7" class="text-center py-4 text-muted">No se encontraron reservas con los filtros actuales.</td></tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Paginación -->
          <div class="pagination mt-4">
            <button class="btn btn--outline btn--sm" [disabled]="currentPage === 1" (click)="loadPage(currentPage - 1)">Anterior</button>
            <span class="px-3">Página {{ currentPage }} de {{ totalPages }}</span>
            <button class="btn btn--outline btn--sm" [disabled]="currentPage === totalPages" (click)="loadPage(currentPage + 1)">Siguiente</button>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './bookings-mgmt.component.scss'
})
export class BookingsMgmtComponent implements OnInit {
  private bookingService = inject(BookingService);

  bookings: BookingSummary[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  
  searchTerm = '';
  statusFilter = '';

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.isLoading = true;
    this.bookingService.getManagementBookings(this.currentPage, 15).subscribe({
      next: (res) => {
        let items = res.data.items || [];
        
        // Simulación de filtros en el cliente (En prod lo hace el backend)
        if (this.searchTerm) {
          items = items.filter((b: any) => b.pnrCode?.toLowerCase().includes(this.searchTerm.toLowerCase()));
        }
        if (this.statusFilter) {
          items = items.filter((b: any) => b.statusName === this.statusFilter);
        }

        this.bookings = items;
        this.totalPages = res.data.totalPages || 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.bookings = [];
      }
    });
  }

  loadPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBookings();
    }
  }

  cancelBooking(booking: BookingSummary) {
    if (confirm(`¿Está seguro de que desea cancelar la reserva con PNR ${booking.pnrCode}? Esta acción es irreversible.`)) {
      // Usamos el endpoint público/admin de cancelación
      this.bookingService.cancelBooking(booking.id, 'Cancelación administrativa').subscribe({
        next: () => {
          alert('Reserva cancelada exitosamente.');
          this.loadBookings();
        },
        error: () => alert('Error al cancelar la reserva.')
      });
    }
  }
}
