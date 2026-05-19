import { Injectable, signal, computed } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  sub: string;
  email: string;
  role: string | string[];
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly TOKEN_KEY = 'access_token';

  // Signal reactivo: se actualiza cada vez que el token cambia
  private readonly _tokenSignal = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  // Señales derivadas (computed) para el navbar y las guardas
  readonly isAuthenticatedSignal = computed(() => {
    const token = this._tokenSignal();
    if (!token) return false;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  });

  readonly isAdminSignal = computed(() => {
    if (!this.isAuthenticatedSignal()) return false;
    return this.getUserRoles().includes('Admin') || this.getUserRoles().includes('Partner');
  });

  readonly userEmailSignal = computed(() => {
    return this.getDecodedToken()?.email ?? null;
  });

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    // Actualiza el signal para que Angular re-renderice el navbar
    this._tokenSignal.set(token);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    // Limpia el signal
    this._tokenSignal.set(null);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSignal();
  }

  getDecodedToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  getUserId(): string | null {
    return this.getDecodedToken()?.sub ?? null;
  }

  getUserRoles(): string[] {
    const decoded = this.getDecodedToken();
    if (!decoded?.role) return [];
    return Array.isArray(decoded.role) ? decoded.role : [decoded.role];
  }

  hasRole(role: string): boolean {
    return this.getUserRoles().includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }
}
