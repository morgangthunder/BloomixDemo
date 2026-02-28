import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * API Service - Centralized HTTP communication with backend
 * Handles all REST API calls with error handling and authentication
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  private readonly tenantId = environment.tenantId;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /**
   * GET request
   */
  get<T>(endpoint: string, params?: any): Observable<T> {
    const options = {
      headers: this.getHeaders(),
      params: this.getParams(params),
    };

    return this.http
      .get<T>(`${this.baseUrl}${endpoint}`, options)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, data: any): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}${endpoint}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, data: any): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}${endpoint}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http
      .patch<T>(`${this.baseUrl}${endpoint}`, data, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${endpoint}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get default headers with tenant ID
   */
  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });

    // Add tenant ID for multi-tenancy
    if (this.tenantId) {
      headers = headers.set('x-tenant-id', this.tenantId);
    }

    const userId = this.getUserId();
    if (userId) {
      headers = headers.set('x-user-id', userId);
    }

    // Add user role from AuthService — only fall back to env if no user is logged in
    const currentUser = this.authService.currentUser();
    const userRole = currentUser?.role || (!currentUser ? environment.userRole : null);
    if (userRole) {
      headers = headers.set('x-user-role', userRole);
    }

    return headers;
  }

  /**
   * Convert params object to HttpParams
   */
  private getParams(params?: any): HttpParams {
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return httpParams;
  }

  /**
   * Get user ID from AuthService (or fallback to environment default)
   */
  private getUserId(): string | null {
    const currentUser = this.authService.currentUser();
    if (currentUser?.userId) return currentUser.userId;
    // Only fall back to env/localStorage when no user is authenticated
    if (!currentUser) return localStorage.getItem('userId') || environment.defaultUserId;
    return null;
  }

  /**
   * Error handling
   */
  private handleError(error: any) {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
      
      // Specific error messages
      if (error.status === 404) {
        errorMessage = 'Resource not found';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized - Please log in';
      } else if (error.status === 403) {
        errorMessage = 'Access forbidden';
      } else if (error.status === 500) {
        errorMessage = 'Server error - Please try again later';
      }
    }

    // Use warn for 5xx (backend down/unavailable) to reduce console noise in dev
    if (error?.status >= 500) {
      console.warn(`API ${error.status}:`, errorMessage);
    } else {
      console.error('API Error:', errorMessage, error);
    }
    return throwError(() => new Error(errorMessage));
  }
}

