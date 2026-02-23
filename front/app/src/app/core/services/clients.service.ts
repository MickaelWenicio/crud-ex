import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, Client } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/clients`;

  list(page = 1, limit = 50, search?: string): Observable<ApiListResponse<Client>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiListResponse<Client>>(this.baseUrl, { params });
  }

  search(term: string, limit = 20): Observable<Client[]> {
    const params = new HttpParams().set('term', term).set('limit', limit);
    return this.http.get<Client[]>(`${this.baseUrl}/search`, { params });
  }

  create(payload: Partial<Client>) {
    return this.http.post<Client>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Client>) {
    return this.http.patch<Client>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  enrich(cnpj: string) {
    return this.http.get<Record<string, unknown>>(`${this.baseUrl}/cnpj/${cnpj}/enrich`);
  }
}
