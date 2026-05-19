import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TokenService } from '../../../core/services/token.service';
import { LoginRequest, RegisterRequest, LoginResponse } from '../../../shared/models/auth.model';
import { ApiResponse } from '../../../shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/auth`;

  login(request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, request).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.tokenService.setToken(response.data.accessToken);
          this.redirectByRole();
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/register`, request).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.tokenService.setToken(response.data.accessToken);
          this.redirectByRole();
        }
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
