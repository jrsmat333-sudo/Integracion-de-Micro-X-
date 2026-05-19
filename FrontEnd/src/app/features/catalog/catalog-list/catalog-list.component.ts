import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../services/catalog.service';
import { AttractionCardComponent } from '../../../shared/components/attraction-card/attraction-card.component';
import { Attraction } from '../../../shared/models/attraction.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-catalog-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AttractionCardComponent],
  template: `
    <div class="catalog-page">
      <!-- HEADER CATÁLOGO -->
      <section class="catalog-header">
        <div class="catalog-header__bg"></div>
        <div class="catalog-header__overlay"></div>
        <div class="container catalog-header__content text-center">
          <h1>Catálogo de Atracciones</h1>
          <p>Encuentra y reserva tu próxima aventura inolvidable.</p>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="catalog-layout">
            
            <!-- FILTROS LATERALES -->
            <aside class="catalog-filters">
              <div class="filter-card">
                <h3>Buscar</h3>
                <div class="form-group">
                  <input 
                    type="text" 
                    class="form-input" 
                    placeholder="Ej. Tour de buceo..." 
                    [(ngModel)]="searchTerm"
                    (ngModelChange)="onSearchChange($event)"
                  >
                </div>
                
                <!-- Aquí se pueden agregar más filtros como Categorías cuando se integren -->
              </div>
            </aside>

            <!-- GRID DE RESULTADOS -->
            <main class="catalog-results">
              
              @if (isLoading) {
                <!-- SKELETON LOADER -->
                <div class="grid grid--3">
                  @for (item of [1,2,3,4,5,6]; track item) {
                    <div class="card skeleton" style="height: 380px;"></div>
                  }
                </div>
              } @else if (error) {
                <!-- ERROR STATE -->
                <div class="alert alert--danger">
                  <span>⚠️</span> {{ error }}
                </div>
              } @else if (attractions.length === 0) {
                <!-- EMPTY STATE -->
                <div class="empty-state text-center">
                  <div class="empty-state__icon">🔍</div>
                  <h3>No se encontraron resultados</h3>
                  <p class="text-muted">Intenta ajustando tus filtros de búsqueda.</p>
                  <button class="btn btn--outline mt-4" (click)="clearFilters()">Limpiar Filtros</button>
                </div>
              } @else {
                <!-- GRID DE TARJETAS -->
                <div class="catalog-results__header">
                  <p class="text-muted">Mostrando <strong>{{ totalCount }}</strong> atracciones</p>
                </div>
                
                <div class="grid grid--3">
                  @for (attraction of attractions; track attraction.id) {
                    <div class="animate-fade-in-up" [style.animation-delay]="($index * 0.1) + 's'">
                      <app-attraction-card [attraction]="attraction"></app-attraction-card>
                    </div>
                  }
                </div>

                <!-- PAGINACIÓN BÁSICA -->
                @if (totalPages > 1) {
                  <div class="pagination">
                    <button class="btn btn--outline btn--sm" [disabled]="currentPage === 1" (click)="loadPage(currentPage - 1)">Anterior</button>
                    <span class="pagination__info">Página {{ currentPage }} de {{ totalPages }}</span>
                    <button class="btn btn--outline btn--sm" [disabled]="currentPage === totalPages" (click)="loadPage(currentPage + 1)">Siguiente</button>
                  </div>
                }
              }
            </main>

          </div>
        </div>
      </section>
    </div>
  `,
  styleUrl: './catalog-list.component.scss'
})
export class CatalogListComponent implements OnInit {
  private catalogService = inject(CatalogService);
  
  attractions: Attraction[] = [];
  isLoading = true;
  error = '';
  
  // Paginación y Filtros
  currentPage = 1;
  pageSize = 9;
  totalCount = 0;
  totalPages = 0;
  
  searchTerm = '';
  searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.loadAttractions();

    // Configurar debounce para la búsqueda
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1; // Reiniciar a página 1 al buscar
      this.loadAttractions();
    });
  }

  loadAttractions(): void {
    this.isLoading = true;
    this.error = '';

    this.catalogService.getAttractions(this.currentPage, this.pageSize, this.searchTerm)
      .subscribe({
        next: (response) => {
          this.attractions = response.data.items;
          this.totalCount = response.data.totalCount;
          this.totalPages = response.data.totalPages;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Ocurrió un error al cargar las atracciones. Inténtalo de nuevo más tarde.';
          this.isLoading = false;
        }
      });
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadAttractions();
  }

  loadPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadAttractions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
