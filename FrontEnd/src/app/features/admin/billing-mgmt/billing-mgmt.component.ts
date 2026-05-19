import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillingService } from '../../my-account/services/billing.service';

@Component({
  selector: 'app-billing-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="page-header flex-between mb-4">
        <div>
          <h1>Gestión de Facturación</h1>
          <p class="text-muted">Consulta el registro global de facturas emitidas y reportes de pago.</p>
        </div>
        <button class="btn btn--primary">
          <span class="icon">📥</span> Exportar CSV
        </button>
      </div>

      <div class="card p-4">
        @if (isLoading) {
          <div class="text-center p-4"><span class="spinner spinner--primary"></span></div>
        } @else {
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Factura Nº</th>
                  <th>ID Reserva</th>
                  <th>Fecha de Emisión</th>
                  <th>Método Pago</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (inv of invoices; track inv.id) {
                  <tr>
                    <td><strong>{{ inv.invoiceNumber }}</strong></td>
                    <td class="text-muted">{{ inv.bookingId | slice:0:8 }}...</td>
                    <td>{{ inv.createdAt | date:'mediumDate' }}</td>
                    <td>{{ inv.paymentMethodId === 1 ? 'Tarjeta de Crédito' : 'Transferencia' }}</td>
                    <td><strong>{{ inv.total | currency:inv.currencyCode }}</strong></td>
                    <td>
                      <button class="btn-action" title="Descargar PDF">📄</button>
                      <button class="btn-action" title="Ver Detalle">👁️</button>
                    </td>
                  </tr>
                }
                @if (invoices.length === 0) {
                  <tr><td colspan="6" class="text-center py-4 text-muted">No se encontraron facturas registradas.</td></tr>
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
  styleUrl: './billing-mgmt.component.scss'
})
export class BillingMgmtComponent implements OnInit {
  private billingService = inject(BillingService);

  invoices: any[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.isLoading = true;
    this.billingService.getManagementInvoices(this.currentPage, 15).subscribe({
      next: (res) => {
        this.invoices = res.data?.items || [];
        this.totalPages = res.data?.totalPages || 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.invoices = [];
      }
    });
  }

  loadPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadInvoices();
    }
  }
}
