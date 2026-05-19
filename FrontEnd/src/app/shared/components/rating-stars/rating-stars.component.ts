import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rating-stars" [title]="rating + ' de 5'">
      @for (star of stars; track $index) {
        <span class="star" [class.star--filled]="star === 'full'" [class.star--half]="star === 'half'">★</span>
      }
      <span class="rating-count" *ngIf="count !== undefined">({{ count }})</span>
    </div>
  `,
  styles: [`
    .rating-stars {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: #e0e0e0;
      font-size: 1.1rem;
    }
    .star--filled {
      color: var(--color-accent);
    }
    .star--half {
      color: var(--color-accent);
      /* Estilo básico para media estrella visualmente */
      background: linear-gradient(90deg, var(--color-accent) 50%, #e0e0e0 50%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .rating-count {
      color: var(--color-text-muted);
      font-size: 0.85rem;
      margin-left: 4px;
    }
  `]
})
export class RatingStarsComponent {
  @Input() rating: number = 0;
  @Input() count?: number;

  get stars(): string[] {
    const result = [];
    for (let i = 1; i <= 5; i++) {
      if (this.rating >= i) result.push('full');
      else if (this.rating >= i - 0.5) result.push('half');
      else result.push('empty');
    }
    return result;
  }
}
