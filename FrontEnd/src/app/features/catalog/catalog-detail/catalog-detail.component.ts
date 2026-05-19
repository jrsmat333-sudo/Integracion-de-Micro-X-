import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../services/catalog.service';
import { Attraction } from '../../../shared/models/attraction.model';
import { RatingStarsComponent } from '../../../shared/components/rating-stars/rating-stars.component';
import { ItineraryMapComponent } from '../../../shared/components/itinerary-map/itinerary-map.component';
// Nota: Aquí se importaría BookingService cuando lo creemos en la siguiente parte

@Component({
  selector: 'app-catalog-detail',
  standalone: true,
  imports: [CommonModule, RatingStarsComponent, FormsModule, ItineraryMapComponent],
  template: `
    @if (isLoading) {
      <div class="loader-overlay">
        <span class="spinner"></span>
      </div>
    } @else if (error) {
      <div class="container section">
        <div class="alert alert--danger"><span>⚠️</span> {{ error }}</div>
      </div>
    } @else if (attraction) {
      <!-- HERO GALLERY -->
      <section class="detail-hero">
        <img [src]="attraction.mainImageUrl || 'assets/placeholder-detail.jpg'" [alt]="attraction.name" class="detail-hero__img">
        <div class="detail-hero__overlay"></div>
        <div class="container detail-hero__content">
          <div class="badge badge--info mb-2">{{ attraction.categoryName }}</div>
          <h1>{{ attraction.name }}</h1>
          <div class="detail-hero__meta">
            <app-rating-stars [rating]="attraction.ratingAverage" [count]="attraction.ratingCount"></app-rating-stars>
            <span class="meta-item" *ngIf="attraction.locationName">📍 {{ attraction.locationName }}</span>
          </div>
        </div>
      </section>

      <!-- CONTENT & SIDEBAR -->
      <section class="section">
        <div class="container">
          <div class="detail-layout">
            
            <!-- MAIN CONTENT -->
            <main class="detail-content">
              <!-- TABS NAVEGACIÓN -->
              <nav class="tabs">
                <button class="tabs__btn" [class.tabs__btn--active]="activeTab === 'desc'" (click)="activeTab = 'desc'">Descripción</button>
                <button class="tabs__btn" [class.tabs__btn--active]="activeTab === 'itin'" (click)="activeTab = 'itin'">Itinerario</button>
                <button class="tabs__btn" [class.tabs__btn--active]="activeTab === 'incl'" (click)="activeTab = 'incl'">Inclusiones</button>
                <button class="tabs__btn" [class.tabs__btn--active]="activeTab === 'info'" (click)="activeTab = 'info'">Información Útil</button>
              </nav>

              <!-- TABS CONTENIDO -->
              <div class="tabs-content">
                @if (activeTab === 'desc') {
                  <div class="animate-fade-in">
                    <h3>Acerca de esta experiencia</h3>
                    <p class="mt-2">{{ attraction.descriptionFull || attraction.descriptionShort }}</p>
                  </div>
                }

                @if (activeTab === 'itin') {
                  <div class="animate-fade-in">
                    <h3 class="mb-4">El recorrido paso a paso</h3>
                    @if (attraction.itinerary?.stops?.length) {
                      <app-itinerary-map [stops]="attraction.itinerary!.stops!"></app-itinerary-map>
                    } @else {
                      <p class="text-muted mt-2">Esta atracción no tiene un mapa de itinerario configurado.</p>
                    }
                  </div>
                }
                
                @if (activeTab === 'incl') {
                  <div class="animate-fade-in">
                    <h3>¿Qué incluye?</h3>
                    @if (attraction.inclusions && attraction.inclusions.length > 0) {
                      <ul class="inclusion-list mt-2">
                        @for (inc of attraction.inclusions; track inc.inclusionItemId) {
                          <li><span class="icon">✅</span> {{ inc.defaultText }}</li>
                        }
                      </ul>
                    } @else {
                      <p class="text-muted mt-2">No se han especificado inclusiones detalladas para esta atracción.</p>
                    }
                  </div>
                }

                @if (activeTab === 'info') {
                  <div class="animate-fade-in">
                    <h3>Información Adicional</h3>
                    <div class="info-grid mt-2">
                      <div class="info-item" *ngIf="attraction.minAge">
                        <strong>Edad mínima:</strong> {{ attraction.minAge }} años
                      </div>
                      <div class="info-item" *ngIf="attraction.maxGroupSize">
                        <strong>Capacidad máx:</strong> {{ attraction.maxGroupSize }} personas
                      </div>
                      <div class="info-item" *ngIf="attraction.difficultyLevel">
                        <strong>Dificultad:</strong> {{ attraction.difficultyLevel }}
                      </div>
                      <div class="info-item" *ngIf="attraction.meetingPoint">
                        <strong>Punto de encuentro:</strong> {{ attraction.meetingPoint }}
                      </div>
                    </div>
                  </div>
                }
              </div>
            </main>

            <!-- BOOKING SIDEBAR -->
            <aside class="detail-sidebar">
              <div class="booking-widget">
                <h3>Reserva tu lugar</h3>
                <p class="text-muted text-sm mb-4">Verifica disponibilidad y asegura tu cupo.</p>

                <!-- 1. Opciones de Producto -->
                <div class="form-group">
                  <label class="form-label">Selecciona una opción</label>
                  <select class="form-input" [(ngModel)]="selectedProductId" (change)="onProductChange()">
                    <option [ngValue]="null">Elige una modalidad...</option>
                    @for (opt of attraction.productOptions; track opt.id) {
                      <option [ngValue]="opt.id">{{ opt.title }} ({{ opt.durationDescription }})</option>
                    }
                  </select>
                </div>

                <!-- 2. Selector de Fecha -->
                <div class="form-group" *ngIf="selectedProductId">
                  <label class="form-label">Fecha de actividad</label>
                  <input type="date" class="form-input" [(ngModel)]="selectedDate" (change)="checkAvailability()" [min]="today">
                </div>

                <!-- 3. Disponibilidad / Pasajeros -->
                @if (isCheckingAvailability) {
                  <div class="availability-status text-center">
                    <span class="spinner spinner--small"></span> Consultando...
                  </div>
                } @else if (selectedDate && !availabilityInfo) {
                  <div class="alert alert--danger text-sm">
                    No hay cupos disponibles para esta fecha.
                  </div>
                } @else if (availabilityInfo) {
                  <div class="alert alert--success text-sm mb-3">
                    ¡Cupos disponibles! ({{ availabilityInfo.cuposDisponibles }})
                  </div>

                  <!-- Configurar pasajeros según PriceTiers -->
                  <div class="passengers-selector">
                    <label class="form-label">Pasajeros</label>
                    @for (tier of selectedProduct?.priceTiers; track tier.id) {
                      <div class="passenger-row">
                        <div class="passenger-info">
                          <span>{{ tier.ticketCategoryName }}</span>
                          <span class="passenger-price">{{ tier.price | currency:tier.currencyCode }}</span>
                        </div>
                        <div class="passenger-controls">
                          <button class="btn-qty" (click)="updateQty(tier.id, -1)">-</button>
                          <span class="qty">{{ getQty(tier.id) }}</span>
                          <button class="btn-qty" (click)="updateQty(tier.id, 1)">+</button>
                        </div>
                      </div>
                    }
                  </div>

                  <div class="booking-total mt-4">
                    <span>Total estimado:</span>
                    <strong>{{ calculateTotal() | currency:(selectedProduct?.priceTiers?.[0]?.currencyCode || 'USD') }}</strong>
                  </div>

                  <button 
                    class="btn btn--accent btn--block btn--lg mt-4" 
                    [disabled]="calculateTotalQty() === 0"
                    (click)="goToCheckout()">
                    Reservar Ahora
                  </button>
                }
              </div>
            </aside>

          </div>
        </div>
      </section>
    }
  `,
  styleUrl: './catalog-detail.component.scss'
})
export class CatalogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private catalogService = inject(CatalogService);
  // private bookingService = inject(BookingService);

  attraction?: Attraction;
  isLoading = true;
  error = '';
  activeTab = 'desc';

  // Booking Widget State
  today = new Date().toISOString().split('T')[0];
  selectedProductId: string | null = null;
  selectedDate: string = '';
  isCheckingAvailability = false;
  availabilityInfo: any = null; // Mapeado del backend DailyAvailability
  
  // Cantidades seleccionadas por PriceTier ID
  passengerQuantities: { [tierId: string]: number } = {};

  get selectedProduct() {
    return this.attraction?.productOptions?.find(p => p.id === this.selectedProductId);
  }

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (slug) {
      this.loadAttraction(slug);
    } else {
      this.error = 'No se proporcionó una atracción válida.';
      this.isLoading = false;
    }
  }

  loadAttraction(slug: string): void {
    this.catalogService.getAttractionBySlug(slug).subscribe({
      next: (res) => {
        this.attraction = res.data;
        // Pre-seleccionar el primer producto si existe
        if (this.attraction.productOptions?.length) {
          this.selectedProductId = this.attraction.productOptions[0].id;
          this.onProductChange();
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el detalle de la atracción.';
        this.isLoading = false;
      }
    });
  }

  onProductChange(): void {
    this.passengerQuantities = {};
    this.selectedDate = '';
    this.availabilityInfo = null;
    
    // Inicializar cantidades en 0
    this.selectedProduct?.priceTiers?.forEach(tier => {
      this.passengerQuantities[tier.id] = 0;
    });
  }

  checkAvailability(): void {
    if (!this.selectedDate || !this.attraction) return;
    
    this.isCheckingAvailability = true;
    this.availabilityInfo = null;

    // TODO: Esto se reemplazará con la llamada real al BookingService
    // Por ahora, simulamos el endpoint para la UI
    setTimeout(() => {
      // Simulación: Si es un día par, hay cupos.
      const day = new Date(this.selectedDate).getDate();
      if (day % 2 === 0) {
        this.availabilityInfo = { fecha: this.selectedDate, cuposDisponibles: 15 };
      }
      this.isCheckingAvailability = false;
    }, 800);
  }

  getQty(tierId: string): number {
    return this.passengerQuantities[tierId] || 0;
  }

  updateQty(tierId: string, change: number): void {
    const current = this.getQty(tierId);
    const newVal = current + change;
    
    if (newVal >= 0) {
      // Verificar capacidad máxima
      const maxAvailable = this.availabilityInfo?.cuposDisponibles || 0;
      const currentTotal = this.calculateTotalQty();
      
      if (change > 0 && currentTotal >= maxAvailable) return;
      
      this.passengerQuantities[tierId] = newVal;
    }
  }

  calculateTotalQty(): number {
    return Object.values(this.passengerQuantities).reduce((a, b) => a + b, 0);
  }

  calculateTotal(): number {
    if (!this.selectedProduct?.priceTiers) return 0;
    
    return this.selectedProduct.priceTiers.reduce((total, tier) => {
      return total + (tier.price * this.getQty(tier.id));
    }, 0);
  }

  goToCheckout(): void {
    // Aquí se guardaría el state en un StateService y se navegaría al checkout
    this.router.navigate(['/booking/checkout']);
  }
}
