import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../catalog/services/catalog.service';
import { Attraction, ProductOption } from '../../../shared/models/attraction.model';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="page-header mb-4">
        <h1>Gestión de Inventario (Slots)</h1>
        <p class="text-muted">Configura la disponibilidad, horarios y capacidad máxima por atracción.</p>
      </div>

      <div class="grid inventory-layout">
        
        <!-- PANEL LATERAL: SELECTORES -->
        <aside class="inventory-sidebar card p-4">
          <h3 class="mb-3">1. Seleccionar Producto</h3>
          
          <div class="form-group">
            <label class="form-label">Atracción</label>
            <select class="form-input" [(ngModel)]="selectedAttractionId" (change)="onAttractionChange()">
              <option [ngValue]="null">Seleccione atracción...</option>
              @for (attr of attractions; track attr.id) {
                <option [ngValue]="attr.id">{{ attr.name }}</option>
              }
            </select>
          </div>

          <div class="form-group mt-3" *ngIf="selectedAttraction">
            <label class="form-label">Opción de Producto</label>
            <select class="form-input" [(ngModel)]="selectedProductId" (change)="loadSlots()">
              <option [ngValue]="null">Seleccione modalidad...</option>
              <!-- En un caso real se traen del detalle de la atracción -->
              <option value="1">Tour Privado</option>
              <option value="2">Tour Compartido</option>
            </select>
          </div>

          <hr class="my-4">

          <h3 class="mb-3">2. Rango de Fechas</h3>
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input type="date" class="form-input" [(ngModel)]="dateFrom">
          </div>
          <div class="form-group mt-2">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-input" [(ngModel)]="dateTo">
          </div>
          
          <button class="btn btn--primary btn--block mt-4" [disabled]="!selectedProductId" (click)="loadSlots()">
            Buscar Slots
          </button>
        </aside>

        <!-- PANEL PRINCIPAL: SLOTS -->
        <main class="inventory-main card p-4">
          <div class="flex-between mb-4">
            <h2 class="m-0">Slots de Disponibilidad</h2>
            <button class="btn btn--accent" [disabled]="!selectedProductId" (click)="showModal = true">
              <span class="icon">+</span> Agregar Slot
            </button>
          </div>

          @if (!selectedProductId) {
            <div class="empty-state text-center mt-4">
              <span class="icon" style="font-size: 3rem; opacity: 0.5;">📅</span>
              <p class="text-muted mt-3">Selecciona un producto para ver su disponibilidad.</p>
            </div>
          } @else if (isLoading) {
            <div class="text-center p-4"><span class="spinner spinner--primary"></span></div>
          } @else {
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Capacidad Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Datos mockeados para presentación -->
                  <tr>
                    <td><strong>2026-12-25</strong></td>
                    <td>09:00 AM</td>
                    <td>01:00 PM</td>
                    <td>15</td>
                    <td><span class="badge badge--success">Activo</span></td>
                    <td>
                      <button class="btn-action">✏️</button>
                      <button class="btn-action">🗑️</button>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>2026-12-25</strong></td>
                    <td>02:00 PM</td>
                    <td>06:00 PM</td>
                    <td>15</td>
                    <td><span class="badge badge--success">Activo</span></td>
                    <td>
                      <button class="btn-action">✏️</button>
                      <button class="btn-action">🗑️</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          }
        </main>
      </div>

      <!-- MODAL AGREGAR SLOT -->
      @if (showModal) {
        <div class="modal-backdrop">
          <div class="modal card animate-fade-in-up">
            <div class="modal-header flex-between mb-3">
              <h3>Nuevo Slot de Disponibilidad</h3>
              <button class="btn-close" (click)="showModal = false">✖</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-input">
              </div>
              <div class="grid grid--2 gap-2 mt-3">
                <div class="form-group">
                  <label class="form-label">Hora Inicio</label>
                  <input type="time" class="form-input">
                </div>
                <div class="form-group">
                  <label class="form-label">Hora Fin</label>
                  <input type="time" class="form-input">
                </div>
              </div>
              <div class="form-group mt-3">
                <label class="form-label">Capacidad Máxima</label>
                <input type="number" class="form-input" placeholder="Ej. 15">
              </div>
            </div>
            <div class="modal-footer flex-between mt-4 pt-3" style="border-top: 1px solid var(--color-surface-hover);">
              <button class="btn btn--outline" (click)="showModal = false">Cancelar</button>
              <button class="btn btn--primary" (click)="saveSlot()">Guardar Slot</button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit {
  private catalogService = inject(CatalogService);

  attractions: Attraction[] = [];
  selectedAttractionId: string | null = null;
  selectedProductId: string | null = null;
  
  dateFrom: string = '';
  dateTo: string = '';

  isLoading = false;
  showModal = false;

  get selectedAttraction() {
    return this.attractions.find(a => a.id === this.selectedAttractionId);
  }

  ngOnInit() {
    // Inicializar fechas (Hoy a Hoy + 7 días)
    const today = new Date();
    this.dateFrom = today.toISOString().split('T')[0];
    
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    this.dateTo = nextWeek.toISOString().split('T')[0];

    // Cargar atracciones activas para el selector
    this.catalogService.getAttractions(1, 100).subscribe({
      next: (res) => this.attractions = res.data?.items || []
    });
  }

  onAttractionChange() {
    this.selectedProductId = null;
  }

  loadSlots() {
    if (!this.selectedProductId) return;
    
    this.isLoading = true;
    // Simulación de carga desde el backend
    setTimeout(() => {
      this.isLoading = false;
    }, 600);
  }

  saveSlot() {
    alert('Slot guardado exitosamente (Simulación).');
    this.showModal = false;
    this.loadSlots();
  }
}
