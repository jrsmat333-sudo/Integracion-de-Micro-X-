import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { TokenService } from '../../../core/services/token.service';
import { LoginRequest, RegisterRequest, LoginResponse, WrappedAuthResponse } from '../../../shared/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/auth`;

  /**
   * El backend envuelve la respuesta en { success, data: LoginResponse } gracias al ApiResponseWrapperFilter.
   * Extraemos response.data para obtener el token real.
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<WrappedAuthResponse>(`${this.baseUrl}/login`, request).pipe(
      map(response => response.data),
      tap(data => {
        this.tokenService.setToken(data.token);
        this.redirectByRole();
      })
    );
  }

  register(request: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<WrappedAuthResponse>(`${this.baseUrl}/register`, request).pipe(
      map(response => response.data),
      tap(data => {
        this.tokenService.setToken(data.token);
        this.redirectByRole();
      })
    );
  }

  logout(): void {
    this.tokenService.removeToken();
    this.router.navigate(['/auth/login']);
  }

  private redirectByRole(): void {
    if (this.tokenService.isAdmin() || this.tokenService.hasRole('Partner')) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/catalog']);
    }
  }
}
