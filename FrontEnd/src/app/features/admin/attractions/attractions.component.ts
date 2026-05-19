import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CatalogService } from '../../catalog/services/catalog.service';
import { Attraction } from '../../../shared/models/attraction.model';

@Component({
  selector: 'app-attractions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="page-header flex-between mb-4">
        <div>
          <h1>Gestión de Atracciones</h1>
          <p class="text-muted">Administra el catálogo de experiencias turísticas.</p>
        </div>
        <button class="btn btn--primary" (click)="openForm()" *ngIf="!showForm">
          <span class="icon">+</span> Nueva Atracción
        </button>
        <button class="btn btn--outline" (click)="closeForm()" *ngIf="showForm">
          Volver a la Lista
        </button>
      </div>

      <!-- VISTA DE LISTA -->
      @if (!showForm) {
        <div class="card p-4">
          <div class="filters-bar flex-between mb-4">
            <div class="search-box">
              <input type="text" class="form-input" placeholder="Buscar atracción..." [(ngModel)]="searchTerm" (keyup.enter)="loadAttractions()">
            </div>
          </div>

          @if (isLoading) {
            <div class="text-center p-4"><span class="spinner spinner--primary"></span></div>
          } @else {
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (attr of attractions; track attr.id) {
                    <tr>
                      <td><strong>{{ attr.name }}</strong></td>
                      <td>{{ attr.categoryName || 'N/A' }}</td>
                      <td>{{ attr.locationName || 'N/A' }}</td>
                      <td>
                        <span class="badge" [class.badge--success]="attr.isActive" [class.badge--danger]="!attr.isActive">
                          {{ attr.isActive ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td>
                        <button class="btn-action" (click)="editAttraction(attr)" title="Editar">✏️</button>
                        <button class="btn-action" title="Eliminar/Desactivar">🗑️</button>
                      </td>
                    </tr>
                  }
                  @if (attractions.length === 0) {
                    <tr><td colspan="5" class="text-center py-4 text-muted">No se encontraron atracciones.</td></tr>
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
      }

      <!-- VISTA DE FORMULARIO -->
      @if (showForm) {
        <div class="card form-card">
          <div class="tabs-header">
            <button class="tab-btn" [class.active]="activeTab === 'basic'" (click)="activeTab = 'basic'">Datos Básicos</button>
            <button class="tab-btn" [class.active]="activeTab === 'media'" (click)="activeTab = 'media'">Medios</button>
            <button class="tab-btn" [class.active]="activeTab === 'products'" (click)="activeTab = 'products'">Opciones de Producto</button>
            <button class="tab-btn" [class.active]="activeTab === 'itinerary'" (click)="activeTab = 'itinerary'">Itinerario</button>
          </div>

          <div class="tabs-content p-4">
            <form [formGroup]="attractionForm" (ngSubmit)="saveAttraction()">
              
              <!-- TAB 1: BÁSICOS -->
              @if (activeTab === 'basic') {
                <div class="animate-fade-in">
                  <h3 class="mb-3">Información General</h3>
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Nombre</label>
                      <input type="text" class="form-input" formControlName="name">
                    </div>
                    <div class="form-group">
                      <label class="form-label">Slug (URL amigable)</label>
                      <input type="text" class="form-input" formControlName="slug">
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Descripción Corta</label>
                    <textarea class="form-input" rows="2" formControlName="descriptionShort"></textarea>
                  </div>
                  
                  <div class="form-group">
                    <label class="form-label">Descripción Completa</label>
                    <textarea class="form-input" rows="5" formControlName="descriptionFull"></textarea>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Categoría</label>
                      <select class="form-input" formControlName="subcategoryId">
                        <option value="">Seleccione...</option>
                        <!-- Aquí se iterarían las categorías de CatalogSetup -->
                        <option value="1">Aventura</option>
                        <option value="2">Relajación</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Estado</label>
                      <select class="form-input" formControlName="isActive">
                        <option [ngValue]="true">Activo</option>
                        <option [ngValue]="false">Inactivo</option>
                      </select>
                    </div>
                  </div>
                </div>
              }

              <!-- TAB 2: MEDIOS (Simulado) -->
              @if (activeTab === 'media') {
                <div class="animate-fade-in">
                  <h3 class="mb-3">Galería de Imágenes</h3>
                  <div class="upload-zone mb-4 text-center">
                    <span class="icon" style="font-size: 2rem;">📸</span>
                    <p>Arrastra imágenes aquí o haz clic para subir</p>
                    <input type="file" style="display:none;" id="fileUpload">
                    <label for="fileUpload" class="btn btn--outline btn--sm mt-2">Seleccionar Archivos</label>
                  </div>
                  <p class="text-muted text-sm">Esta función requiere integración con Azure Blob Storage para subida real.</p>
                </div>
              }

              <!-- TAB 3: PRODUCTOS -->
              @if (activeTab === 'products') {
                <div class="animate-fade-in">
                  <div class="flex-between mb-3">
                    <h3>Opciones de Producto y Precios</h3>
                  </div>
                  <p class="text-muted text-sm mb-4">Ejemplo: Tour Privado, Tour Compartido, etc.</p>
                  
                  <!-- Formulario temporal interactivo simulado -->
                  <div class="alert alert--info">
                    Módulo de Opciones de Producto se implementará con FormArray dinámico en integración completa.
                  </div>
                </div>
              }

              <!-- TAB 4: ITINERARIO -->
              @if (activeTab === 'itinerary') {
                <div class="animate-fade-in">
                  <h3>Itinerario (Paradas)</h3>
                  <p class="text-muted text-sm mb-4">Define el recorrido paso a paso.</p>
                  
                  <div class="alert alert--info">
                    Módulo de Google Maps Embed y puntos de Itinerario en desarrollo.
                  </div>
                </div>
              }

              <div class="form-actions mt-4 pt-4" style="border-top: 1px solid var(--color-surface-hover);">
                <button type="submit" class="btn btn--primary" [disabled]="attractionForm.invalid">Guardar Atracción</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './attractions.component.scss'
})
export class AttractionsComponent implements OnInit {
  private catalogService = inject(CatalogService);
  private fb = inject(FormBuilder);

  attractions: Attraction[] = [];
  isLoading = true;
  currentPage = 1;
  totalPages = 1;
  searchTerm = '';

  // Form State
  showForm = false;
  activeTab = 'basic';
  attractionForm: FormGroup;
  editingId: string | null = null;

  constructor() {
    this.attractionForm = this.fb.group({
      name: ['', Validators.required],
      slug: ['', Validators.required],
      descriptionShort: ['', Validators.required],
      descriptionFull: [''],
      subcategoryId: ['', Validators.required],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadAttractions();
  }

  loadAttractions() {
    this.isLoading = true;
    this.catalogService.getAttractions(this.currentPage, 10, this.searchTerm).subscribe({
      next: (res) => {
        this.attractions = res.data.items;
        this.totalPages = res.data.totalPages || 1;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        // Mock data fallback si falla backend
        this.attractions = [];
      }
    });
  }

  loadPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadAttractions();
    }
  }

  openForm() {
    this.editingId = null;
    this.attractionForm.reset({ isActive: true });
    this.activeTab = 'basic';
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
  }

  editAttraction(attr: Attraction) {
    this.editingId = attr.id;
    this.attractionForm.patchValue({
      name: attr.name,
      slug: attr.slug,
      descriptionShort: attr.descriptionShort,
      descriptionFull: attr.descriptionFull,
      subcategoryId: attr.subcategoryId, // Needs real mapping
      isActive: attr.isActive
    });
    this.activeTab = 'basic';
    this.showForm = true;
  }

  saveAttraction() {
    if (this.attractionForm.valid) {
      alert('Atracción guardada (Simulación).');
      this.closeForm();
      this.loadAttractions();
    }
  }
}
