import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, catchError } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DoctorGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.authService.validateTokenUsuarios().pipe(
      map(response => {
        // Si es médico (rol 2)
        if (response.rol === 2) {
          return true;
        }
        // Si es paciente (rol 3)
        else if (response.rol === 3) {
          this.router.navigate(['/calendar']);
          return false;
        }
        // Si es cualquier otro rol o no tiene rol
        else {
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError((error) => {
        console.error('Error validando token:', error);
        this.router.navigate(['/login']);
        return [false];
      })
    );
  }
}