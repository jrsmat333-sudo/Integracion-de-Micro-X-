import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../catalog/services/catalog.service';

@Component({
  selector: 'app-catalog-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page animate-fade-in">
      <div class="page-header mb-4">
        <h1>Configuración del Catálogo</h1>
        <p class="text-muted">Gestiona categorías, ubicaciones, etiquetas y parámetros base.</p>
      </div>

      <div class="card p-0">
        <!-- TABS HEADER -->
        <div class="tabs-header">
          <button class="tab-btn" [class.active]="activeTab === 'categories'" (click)="activeTab = 'categories'">Categorías</button>
          <button class="tab-btn" [class.active]="activeTab === 'subcategories'" (click)="activeTab = 'subcategories'">Subcategorías</button>
          <button class="tab-btn" [class.active]="activeTab === 'locations'" (click)="activeTab = 'locations'">Ubicaciones</button>
          <button class="tab-btn" [class.active]="activeTab === 'tags'" (click)="activeTab = 'tags'">Tags</button>
          <button class="tab-btn" [class.active]="activeTab === 'tickets'" (click)="activeTab = 'tickets'">Tipos de Ticket</button>
        </div>

        <div class="tabs-content p-4">
          
          <!-- CONTROLES SUPERIORES (COMUNES) -->
          <div class="flex-between mb-4">
            <div class="search-box">
              <input type="text" class="form-input" placeholder="Buscar..." [(ngModel)]="searchTerm">
            </div>
            <button class="btn btn--primary" (click)="openModal()">
              <span class="icon">+</span> Nuevo Registro
            </button>
          </div>

          <!-- TAB: CATEGORÍAS -->
          @if (activeTab === 'categories') {
            <div class="animate-fade-in">
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Slug</th>
                      <th>Ícono</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (cat of mockCategories; track cat.id) {
                      <tr>
                        <td><strong>{{ cat.name }}</strong></td>
                        <td>{{ cat.slug }}</td>
                        <td><span class="icon">{{ cat.icon }}</span></td>
                        <td><span class="badge badge--success">Activo</span></td>
                        <td>
                          <button class="btn-action" title="Editar">✏️</button>
                          <button class="btn-action" title="Eliminar">🗑️</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB: SUBCATEGORÍAS -->
          @if (activeTab === 'subcategories') {
            <div class="animate-fade-in">
              <p class="text-muted mb-3">Las subcategorías dependen de una categoría padre.</p>
              <div class="table-responsive">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría Padre</th>
                      <th>Slug</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Surf</strong></td>
                      <td>Aventura Acuática</td>
                      <td>surf</td>
                      <td>
                        <button class="btn-action" title="Editar">✏️</button>
                        <button class="btn-action" title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- TAB: UBICACIONES -->
          @if (activeTab === 'locations') {
            <div class="animate-fade-in">
              <div class="alert alert--info mb-3">Las ubicaciones pueden tener una jerarquía (País -> Ciudad -> Región).</div>
              <table class="table">
                <thead><tr><th>Nombre</th><th>Tipo</th><th>Pertenece a</th><th>Acciones</th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>Islas Galápagos</strong></td>
                    <td>Provincia</td>
                    <td>Ecuador</td>
                    <td><button class="btn-action">✏️</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          }

          <!-- TAB: TAGS -->
          @if (activeTab === 'tags') {
            <div class="animate-fade-in">
              <table class="table">
                <thead><tr><th>Nombre</th><th>Slug</th><th>Usado en Atracciones</th><th>Acciones</th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>Eco-Friendly</strong></td>
                    <td>eco-friendly</td>
                    <td>12</td>
                    <td><button class="btn-action">✏️</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          }

          <!-- TAB: TICKETS -->
          @if (activeTab === 'tickets') {
            <div class="animate-fade-in">
              <p class="text-muted mb-3">Define los tipos de pasajeros válidos para los Price Tiers.</p>
              <table class="table">
                <thead><tr><th>Tipo de Ticket</th><th>Nombre Inglés</th><th>Rango de Edad</th><th>Acciones</th></tr></thead>
                <tbody>
                  <tr>
                    <td><strong>Adulto</strong></td>
                    <td>Adult</td>
                    <td>13 - 99</td>
                    <td><button class="btn-action">✏️</button></td>
                  </tr>
                  <tr>
                    <td><strong>Niño</strong></td>
                    <td>Child</td>
                    <td>3 - 12</td>
                    <td><button class="btn-action">✏️</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          }

        </div>
      </div>

      <!-- MODAL SIMULADO -->
      @if (showModal) {
        <div class="modal-backdrop">
          <div class="modal card animate-fade-in-up">
            <div class="modal-header flex-between mb-3">
              <h3>Agregar Registro</h3>
              <button class="btn-close" (click)="showModal = false">✖</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" class="form-input" placeholder="Ej. Aventura">
              </div>
              <div class="form-group">
                <label class="form-label">Slug</label>
                <input type="text" class="form-input" placeholder="ej-aventura">
              </div>
            </div>
            <div class="modal-footer flex-between mt-4">
              <button class="btn btn--outline" (click)="showModal = false">Cancelar</button>
              <button class="btn btn--primary" (click)="saveRecord()">Guardar</button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styleUrl: './catalog-setup.component.scss'
})
export class CatalogSetupComponent implements OnInit {
  activeTab = 'categories';
  searchTerm = '';
  showModal = false;

  // Mock data for UI presentation
  mockCategories = [
    { id: '1', name: 'Aventura Acuática', slug: 'aventura-acuatica', icon: '🏄' },
    { id: '2', name: 'Relajación y Bienestar', slug: 'relajacion', icon: '🧘' },
    { id: '3', name: 'Gastronomía Local', slug: 'gastronomia', icon: '🍲' },
  ];

  ngOnInit() {
    // In a real app, load data based on the active tab
  }

  openModal() {
    this.showModal = true;
  }

  saveRecord() {
    alert('Registro guardado exitosamente.');
    this.showModal = false;
  }
}
