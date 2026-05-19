import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Attraction, Category } from '../../../shared/models/attraction.model';
import { ApiResponse, PagedResult } from '../../../shared/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAttractions(page: number = 1, pageSize: number = 20, search?: string, categorySlug?: string): Observable<ApiResponse<PagedResult<Attraction>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    if (search) params = params.set('search', search);
    // Asumiendo que el backend soporta filtro por subcategoryId o que lo mapearemos
    // if (categorySlug) params = params.set('category', categorySlug); 

    // Ojo: Usamos /api/v1/attraction basado en la auditoría
    return this.http.get<ApiResponse<PagedResult<Attraction>>>(`${this.baseUrl}/api/v1/attraction`, { params });
  }

  getAttractionBySlug(slug: string): Observable<ApiResponse<Attraction>> {
    return this.http.get<ApiResponse<Attraction>>(`${this.baseUrl}/api/v1/attraction/${slug}`);
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/api/v1/category`);
  }
}
