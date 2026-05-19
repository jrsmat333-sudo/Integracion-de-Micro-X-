import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BookingRequest, BookingResponse, BookingSummary, DailyAvailability } from '../../../shared/models/booking.model';
import { ApiResponse, PagedResult } from '../../../shared/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Usa el endpoint público que agregaste para la disponibilidad
  checkAvailability(attractionId: string, date: string): Observable<ApiResponse<DailyAvailability[]>> {
    return this.http.get<ApiResponse<DailyAvailability[]>>(`${this.baseUrl}/api/v1/booking/disponibilidad?attractionId=${attractionId}&fecha=${date}`);
  }

  // Crea la reserva en el microservicio Booking
  createBooking(request: BookingRequest): Observable<ApiResponse<BookingResponse>> {
    return this.http.post<ApiResponse<BookingResponse>>(`${this.baseUrl}/api/v1/booking`, request);
  }

  // Historial para "Mi Cuenta"
  getMyBookings(): Observable<ApiResponse<BookingSummary[]>> {
    return this.http.get<ApiResponse<BookingSummary[]>>(`${this.baseUrl}/api/v1/booking/mis-reservas`);
  }

  // Cancelación
  cancelBooking(id: string, reason: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/api/v1/booking/${id}/cancel`, { reason });
  }

  // Para el Panel de Administración
  getManagementBookings(page = 1, pageSize = 10): Observable<ApiResponse<PagedResult<BookingSummary>>> {
    return this.http.get<ApiResponse<PagedResult<BookingSummary>>>(`${this.baseUrl}/api/v1/admin-booking/management?page=${page}&pageSize=${pageSize}`);
  }
}
