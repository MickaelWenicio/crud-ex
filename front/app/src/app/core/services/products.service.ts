import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiListResponse, Product, ProductImage } from '../models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/products`;
  private readonly apiOrigin = new URL(environment.apiUrl).origin;

  list(page = 1, limit = 50, search?: string): Observable<ApiListResponse<Product>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiListResponse<Product>>(this.baseUrl, { params });
  }

  create(payload: Partial<Product>) {
    return this.http.post<Product>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<Product>) {
    return this.http.patch<Product>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  uploadImages(productId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return this.http.post<ProductImage[]>(`${this.baseUrl}/${productId}/images`, formData);
  }

  listImages(productId: string) {
    return this.http.get<ProductImage[]>(`${this.baseUrl}/${productId}/images`);
  }

  removeImage(productId: string, imageId: string) {
    return this.http.delete<void>(`${this.baseUrl}/${productId}/images/${imageId}`);
  }

  getImageUrl(image: ProductImage): string {
    if (image.url && image.url.startsWith('http')) return image.url;
    if (image.url && image.url.startsWith('/')) return `${this.apiOrigin}${image.url}`;

    const normalizedPath = image.path?.replace(/\\/g, '/');
    if (normalizedPath?.startsWith('uploads/')) return `${this.apiOrigin}/${normalizedPath}`;
    if (image.filename) return `${this.apiOrigin}/uploads/${image.filename}`;

    return '';
  }
}
