import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BookingSummary } from '../../../shared/models/booking.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page animate-fade-in">
      <h1 class="mb-4">Resumen General</h1>

      <!-- WIDGETS -->
      <div class="grid grid--4 mb-4">
        <div class="widget card p-4">
          <div class="widget-icon" style="background: rgba(46, 139, 87, 0.1); color: #2E8B57;">🎫</div>
          <div class="widget-data">
            <span class="widget-label">Reservas del Mes</span>
            <strong class="widget-value">{{ metrics.totalBookings }}</strong>
          </div>
        </div>

        <div class="widget card p-4">
          <div class="widget-icon" style="background: rgba(212, 168, 83, 0.1); color: #A07D2E;">💰</div>
          <div class="widget-data">
            <span class="widget-label">Ingresos Estimados</span>
            <strong class="widget-value">{{ metrics.totalIncome | currency:'USD' }}</strong>
          </div>
        </div>

        <div class="widget card p-4">
          <div class="widget-icon" style="background: rgba(42, 127, 138, 0.1); color: #2A7F8A;">🏝️</div>
          <div class="widget-data">
            <span class="widget-label">Atracciones Activas</span>
            <strong class="widget-value">{{ metrics.activeAttractions }}</strong>
          </div>
        </div>

        <div class="widget card p-4">
          <div class="widget-icon" style="background: rgba(192, 57, 43, 0.1); color: #C0392B;">⚠️</div>
          <div class="widget-data">
            <span class="widget-label">Cancelaciones</span>
            <strong class="widget-value">{{ metrics.cancelledBookings }}</strong>
          </div>
        </div>
      </div>

      <!-- ÚLTIMAS RESERVAS -->
      <div class="card p-4">
        <h3 class="mb-3">Últimas 5 Reservas</h3>
        
        @if (isLoading) {
          <div class="text-center p-4"><span class="spinner spinner--primary"></span></div>
        } @else {
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>PNR</th>
                  <th>Atracción</th>
                  <th>Fecha Actividad</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (b of recentBookings; track b.id) {
                  <tr>
                    <td><strong>{{ b.pnrCode }}</strong></td>
                    <td>{{ b.attractionName || 'N/A' }}</td>
                    <td>{{ b.activityDate | date }}</td>
                    <td>{{ b.totalAmount | currency:b.currencyCode }}</td>
                    <td>
                      <span class="badge" 
                            [class.badge--success]="b.statusName === 'Confirmed'"
                            [class.badge--danger]="b.statusName === 'Cancelled'"
                            [class.badge--info]="b.statusName === 'Pending'">
                        {{ b.statusName }}
                      </span>
                    </td>
                  </tr>
                }
                @if (recentBookings.length === 0) {
                  <tr><td colspan="5" class="text-center py-3 text-muted">No hay reservas recientes.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  
  isLoading = true;
  recentBookings: BookingSummary[] = [];
  
  metrics = {
    totalBookings: 0,
    totalIncome: 0,
    activeAttractions: 0,
    cancelledBookings: 0
  };

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading = true;
    
    // Obtenemos reservas de gestión (Admin) - Traemos la primera página con 100 para calcular métricas de demo
    this.http.get<any>(`${environment.apiUrl}/api/v1/admin-booking/management?page=1&pageSize=100`).subscribe({
      next: (res) => {
        const bookings: any[] = res.data?.items || [];
        
        // Simular cálculos de métricas en frontend basados en la primera página
        this.metrics.totalBookings = bookings.length;
        this.metrics.cancelledBookings = bookings.filter(b => b.statusName === 'Cancelled').length;
        this.metrics.totalIncome = bookings
          .filter(b => b.statusName === 'Confirmed')
          .reduce((sum, current) => sum + current.totalAmount, 0);
          
        // Últimas 5
        this.recentBookings = bookings.slice(0, 5);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // Atrapar count de atracciones
    this.http.get<any>(`${environment.apiUrl}/api/v1/attraction?page=1&pageSize=1`).subscribe(res => {
      this.metrics.activeAttractions = res.data?.totalCount || 0;
    });
  }
}
