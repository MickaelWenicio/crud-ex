import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, Order } from '../models';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/orders`;

  list(page = 1, limit = 50, search?: string, clientId?: string): Observable<ApiListResponse<Order>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (clientId && clientId !== 'all') {
      params = params.set('clientId', clientId);
    }
    return this.http.get<ApiListResponse<Order>>(this.baseUrl, { params });
  }

  listMine(page = 1, limit = 50, search?: string, clientId?: string): Observable<ApiListResponse<Order>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    if (clientId && clientId !== 'all') {
      params = params.set('clientId', clientId);
    }
    return this.http.get<ApiListResponse<Order>>(`${this.baseUrl}/me`, { params });
  }

  create(payload: {
    clientId: string;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    return this.http.post<Order>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Order> & { items?: Array<{ productId: string; quantity: number }> }) {
    return this.http.patch<Order>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
