import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';


interface LoginResponse {
  token: string;
  message?: string;
}

interface RegisterResponse {
  message: string;
}

interface User {
  id: number;
  usuario: string;
  rol: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/auth';
  private tokenKey = 'auth_token';
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkToken();
  }

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { usuario, password })
      .pipe(
        tap(response => {
          if (response.token) {
            localStorage.setItem(this.tokenKey, response.token);
            this.validateToken();
          }
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Error completo:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      console.error('Error del cliente:', error.error.message);
      return throwError(() => new Error('Ocurrió un error de conexión. Por favor, intenta de nuevo.'));
    } else {
      // El backend retornó un código de error
      console.error(
        `Backend retornó código ${error.status}, ` +
        `body was: ${JSON.stringify(error.error)}`);
      
      // Manejar diferentes códigos de estado
      switch (error.status) {
        case 401:
          return throwError(() => ({
            status: 401,
            message: 'Credenciales inválidas'
          }));
        case 403:
          return throwError(() => ({
            status: 403,
            message: 'Por favor verifica tu cuenta antes de iniciar sesión'
          }));
        case 404:
          return throwError(() => ({
            status: 404,
            message: 'Usuario no encontrado'
          }));
        case 500:
          return throwError(() => ({
            status: 500,
            message: 'Error en el servidor. Por favor intenta más tarde'
          }));
        default:
          return throwError(() => ({
            status: error.status,
            message: 'Error al iniciar sesión. Por favor intenta más tarde'
          }));
      }
    }
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private checkToken(): void {
    const token = this.getToken();
    if (token) {
      this.validateToken();
    }
  }

  validateToken(): Observable<any> {
    return this.http.get<any>('http://localhost:5000/usuarios/validar-token')
      .pipe(
        tap(response => {
          const user: User = {
            id: response.id,
            usuario: response.usuario,
            rol: response.rol
          };
          this.userSubject.next(user);
        }),
        catchError(this.handleError)
      );
  }

  register(userData: {
    nombre: string;
    apellidopaterno: string;
    apellidomaterno: string;
    correo: string;
    edad: number;
    usuario: string;
    password: string;
    rol?: number; // Opcional, podría tener un valor por defecto en el backend
  }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, {
      ...userData,
      rol: userData.rol || 1, // Valor por defecto para usuarios normales
      verificado: false
    }).pipe(
      catchError(this.handleErrorRegister)
    );
  }

  private handleErrorRegister(error: HttpErrorResponse) {
    console.error('Error completo:', error);
    
    if (error.error instanceof ErrorEvent) {
      return throwError(() => new Error('Error de conexión. Por favor, intenta de nuevo.'));
    } else {
      switch (error.status) {
        case 400:
          if (error.error.message.includes('correo')) {
            return throwError(() => ({
              status: 400,
              message: 'El correo ya está en uso'
            }));
          } else if (error.error.message.includes('usuario')) {
            return throwError(() => ({
              status: 400,
              message: 'El nombre de usuario ya está en uso'
            }));
          }
          return throwError(() => ({
            status: 400,
            message: error.error.message
          }));
        case 500:
          return throwError(() => ({
            status: 500,
            message: 'Error en el servidor. Por favor intenta más tarde'
          }));
        default:
          return throwError(() => ({
            status: error.status,
            message: 'Error en el registro. Por favor intenta más tarde'
          }));
      }
    }
  }
}
