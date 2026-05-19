import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { InvoiceSummary, InvoiceFull } from '../../../shared/models/billing.model';
import { ApiResponse, PagedResult } from '../../../shared/models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getMyInvoices(): Observable<ApiResponse<InvoiceSummary[]>> {
    // Usamos el endpoint definido en la auditoría
    return this.http.get<ApiResponse<InvoiceSummary[]>>(`${this.baseUrl}/api/v1/billing/my-invoices`);
  }

  getInvoiceDetail(id: string): Observable<ApiResponse<InvoiceFull>> {
    return this.http.get<ApiResponse<InvoiceFull>>(`${this.baseUrl}/api/v1/billing/management/${id}`);
  }

  getManagementInvoices(page = 1, pageSize = 10): Observable<ApiResponse<PagedResult<InvoiceSummary>>> {
    return this.http.get<ApiResponse<PagedResult<InvoiceSummary>>>(`${this.baseUrl}/api/v1/billing/management?page=${page}&pageSize=${pageSize}`);
  }
}
