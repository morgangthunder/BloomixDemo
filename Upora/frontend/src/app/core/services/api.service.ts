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

    // Add user ID if available (for future auth)
    const userId = this.getUserId();
    if (userId) {
      headers = headers.set('x-user-id', userId);
      console.log('[ApiService] Setting x-user-id header:', userId);
    } else {
      console.warn('[ApiService] No user ID available');
    }

    // Add user role from AuthService (or fallback to environment)
    const currentUser = this.authService.currentUser();
    const userRole = currentUser?.role || environment.userRole;
    if (userRole) {
      headers = headers.set('x-user-role', userRole);
      console.log('[ApiService] Setting x-user-role header:', userRole);
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
    console.log('[ApiService] Current user from AuthService:', currentUser);
    if (currentUser?.userId) {
      console.log('[ApiService] Using user ID from AuthService:', currentUser.userId);
      return currentUser.userId;
    }
    // Fallback to localStorage or environment default
    const fallbackId = localStorage.getItem('userId') || environment.defaultUserId;
    console.log('[ApiService] Using fallback user ID:', fallbackId);
    return fallbackId;
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

