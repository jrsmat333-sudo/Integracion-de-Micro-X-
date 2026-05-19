import { Component, Input, AfterViewInit, OnDestroy, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TourStop } from '../../models/attraction.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-itinerary-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="itinerary-container grid">
      <div class="itinerary-list">
        @for (stop of stops; track stop.id; let idx = $index) {
          <div class="itinerary-stop">
            <div class="stop-number">{{ idx + 1 }}</div>
            <div class="stop-content">
              <h4>{{ stop.name }}</h4>
              <p *ngIf="stop.description">{{ stop.description }}</p>
              <span class="text-sm text-muted" *ngIf="stop.durationMinutes">
                ⏱️ {{ stop.durationMinutes }} minutos
              </span>
            </div>
          </div>
        }
      </div>
      <div class="map-wrapper">
        <div class="map-container" #mapContainer></div>
      </div>
    </div>
  `,
  styles: [`
    .itinerary-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-xl);
      align-items: flex-start;
    }
    
    @media (max-width: 768px) {
      .itinerary-container {
        grid-template-columns: 1fr;
      }
    }

    .itinerary-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-md);
      position: relative;
    }
    
    .itinerary-list::before {
      content: '';
      position: absolute;
      top: 20px;
      bottom: 20px;
      left: 15px;
      width: 2px;
      background: var(--color-surface-hover);
      z-index: 0;
    }

    .itinerary-stop {
      display: flex;
      gap: var(--space-md);
      position: relative;
      z-index: 1;
    }

    .stop-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--color-accent);
      color: #fff;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 3px solid #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stop-content {
      background: var(--color-surface);
      padding: var(--space-md);
      border-radius: var(--radius-md);
      flex: 1;
      
      h4 { margin-bottom: 4px; color: var(--color-primary); }
      p { margin-bottom: 6px; font-size: 0.95rem; }
    }

    .map-wrapper {
      position: sticky;
      top: 20px;
    }

    .map-container {
      height: 450px;
      width: 100%;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
      z-index: 1;
    }
  `]
})
export class ItineraryMapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;
  @Input() stops: TourStop[] = [];

  private map: L.Map | null = null;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit() {
    if (this.isBrowser && this.stops && this.stops.length > 0) {
      // Pequeño timeout para asegurar que el contenedor tiene ancho/alto
      setTimeout(() => this.initMap(), 100);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    if (this.map) return;
    
    // Configuración base de iconos por defecto
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    // Encontrar la primera parada con coordenadas para centrar
    const firstStop = this.stops.find(s => s.latitude && s.longitude);
    const initialLat = firstStop?.latitude || 0;
    const initialLng = firstStop?.longitude || 0;

    this.map = L.map(this.mapContainer.nativeElement).setView([initialLat, initialLng], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(this.map);

    const bounds = L.latLngBounds([]);
    const latlngs: L.LatLngTuple[] = [];

    this.stops.forEach((stop, index) => {
      if (stop.latitude && stop.longitude) {
        const coord: L.LatLngTuple = [stop.latitude, stop.longitude];
        latlngs.push(coord);
        bounds.extend(coord);

        const numericIcon = L.divIcon({
          className: 'custom-div-icon',
          html: '<div style="background-color: #d4a853; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); margin-top: -14px; margin-left: -14px;">' + (index + 1) + '</div>',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker(coord, { icon: numericIcon }).addTo(this.map!);
        
        marker.bindPopup(
          '<strong>Parada ' + (index + 1) + ': ' + stop.name + '</strong><br>' +
          (stop.durationMinutes ? '<small>Duración: ' + stop.durationMinutes + ' min</small>' : '')
        );
      }
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#1A3C5E', weight: 4, opacity: 0.8, dashArray: '8, 8' }).addTo(this.map);
    }

    if (latlngs.length > 0) {
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }
}
