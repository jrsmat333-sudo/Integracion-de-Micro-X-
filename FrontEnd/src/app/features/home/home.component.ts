import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- HERO SECTION -->
    <section class="hero">
      <div class="hero__bg"></div>
      <div class="hero__overlay"></div>
      <div class="hero__content container animate-fade-in-up">
        <span class="hero__tagline">TideScape Beach Resort & Adventures</span>
        <h1>Descubre experiencias más allá de la costa</h1>
        <p>Explora atracciones únicas, reserva tu aventura y crea memorias inolvidables en destinos de lujo.</p>
        <a routerLink="/catalog" class="btn btn--accent btn--lg">Explorar Atracciones</a>
      </div>
    </section>

    <!-- CATEGORÍAS SECTION -->
    <section class="section section--light">
      <div class="container">
        <div class="section-header text-center">
          <h2>Experiencias diseñadas para amantes del océano</h2>
          <p class="text-muted">Encuentra la aventura perfecta para ti</p>
        </div>

        <div class="grid grid--4 mt-4">
          <div class="category-card">
            <div class="category-card__icon">🌊</div>
            <h3>Deportes Acuáticos</h3>
            <p>Surf, paddle y más</p>
          </div>
          <div class="category-card">
            <div class="category-card__icon">⛵</div>
            <h3>Tours en Bote</h3>
            <p>Navega el horizonte</p>
          </div>
          <div class="category-card">
            <div class="category-card__icon">🏖️</div>
            <h3>Relajación</h3>
            <p>Playas y spas exclusivos</p>
          </div>
          <div class="category-card">
            <div class="category-card__icon">🐠</div>
            <h3>Buceo</h3>
            <p>Explora la vida marina</p>
          </div>
        </div>
      </div>
    </section>

    <!-- HOW IT WORKS SECTION -->
    <section class="section">
      <div class="container text-center">
        <div class="section-header">
          <h2>¿Cómo funciona?</h2>
        </div>
        <div class="grid grid--3 steps-container">
          <div class="step">
            <div class="step__number">01</div>
            <h3>Elige tu Aventura</h3>
            <p class="text-muted">Navega por nuestro catálogo de atracciones premium.</p>
          </div>
          <div class="step">
            <div class="step__number">02</div>
            <h3>Reserva en Segundos</h3>
            <p class="text-muted">Selecciona tu horario y asegura tu lugar de forma rápida.</p>
          </div>
          <div class="step">
            <div class="step__number">03</div>
            <h3>Disfruta</h3>
            <p class="text-muted">Prepárate para una experiencia inolvidable con TideScape.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA FINAL SECTION -->
    <section class="cta-section">
      <div class="cta-section__bg"></div>
      <div class="cta-section__overlay"></div>
      <div class="container cta-section__content text-center">
        <h2>¿Listo para experimentar TideScape?</h2>
        <p>Reserva hoy y descubre el lujo costero y aventuras sin igual.</p>
        <a routerLink="/catalog" class="btn btn--primary btn--lg mt-4">Ver Catálogo Completo</a>
      </div>
    </section>
  `,
  styleUrl: './home.component.scss'
})
export class HomeComponent {}
