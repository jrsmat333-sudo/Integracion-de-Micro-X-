import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Attraction } from '../../models/attraction.model';
import { RatingStarsComponent } from '../rating-stars/rating-stars.component';

@Component({
  selector: 'app-attraction-card',
  standalone: true,
  imports: [CommonModule, RouterLink, RatingStarsComponent],
  template: `
    <article class="card attraction-card">
      <div class="card__image-container">
        <img 
          [src]="attraction.mainImageUrl || 'assets/placeholder-attraction.jpg'" 
          [alt]="attraction.name" 
          class="card__image"
        >
        <div class="attraction-card__badges">
          <span class="badge badge--info" *ngIf="attraction.categoryName">{{ attraction.categoryName }}</span>
        </div>
      </div>
      
      <div class="card__body">
        <div class="attraction-card__header">
          <h3 class="card__title">{{ attraction.name }}</h3>
          <app-rating-stars [rating]="attraction.ratingAverage" [count]="attraction.ratingCount"></app-rating-stars>
        </div>
        
        <p class="attraction-card__location" *ngIf="attraction.locationName">
          <span class="icon">📍</span> {{ attraction.locationName }}
        </p>
        
        <p class="card__text">{{ attraction.descriptionShort }}</p>
        
        <div class="attraction-card__footer">
          <a [routerLink]="['/catalog', attraction.slug]" class="btn btn--primary btn--sm btn--block">Ver Detalle</a>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .attraction-card {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .card__image-container {
      position: relative;
    }
    .attraction-card__badges {
      position: absolute;
      top: 12px;
      left: 12px;
    }
    .card__body {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card__title {
      margin-bottom: 4px;
      font-size: 1.25rem;
      color: var(--color-primary);
    }
    .attraction-card__location {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      margin-bottom: var(--space-sm);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .card__text {
      margin-bottom: var(--space-lg);
      flex: 1;
    }
    .attraction-card__footer {
      margin-top: auto;
    }
  `]
})
export class AttractionCardComponent {
  @Input({ required: true }) attraction!: Attraction;
}
