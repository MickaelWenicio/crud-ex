import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthTokens, CurrentUser, JwtPayload, UserRole } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly accessTokenKey = 'crud_ex_access_token';
  private readonly refreshTokenKey = 'crud_ex_refresh_token';

  readonly user = signal<CurrentUser | null>(this.readUserFromStorage());

  login(payload: { email: string; password: string }): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.baseUrl}/login`, payload).pipe(
      tap((tokens) => this.persistTokens(tokens)),
    );
  }

  refreshToken(): Observable<AuthTokens> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<AuthTokens>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(tap((tokens) => this.persistTokens(tokens)));
  }

  register(payload: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }) {
    return this.http.post(`${this.baseUrl}/register`, payload);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/logout`, {}).pipe(
      tap(() => this.clearSession()),
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.user();
  }

  hasRole(role: UserRole): boolean {
    return this.user()?.role === role;
  }

  clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.user.set(null);
  }

  private persistTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.accessTokenKey, tokens.accessToken);
    localStorage.setItem(this.refreshTokenKey, tokens.refreshToken);
    const payload = this.decodeJwt(tokens.accessToken);
    if (!payload) {
      this.clearSession();
      return;
    }

    this.user.set({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });
  }

  private readUserFromStorage(): CurrentUser | null {
    const token = this.getAccessToken();
    if (!token) return null;

    const payload = this.decodeJwt(token);
    if (!payload) return null;

    if (payload.exp * 1000 < Date.now()) {
      this.clearSession();
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      const payloadPart = token.split('.')[1];
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }
}
