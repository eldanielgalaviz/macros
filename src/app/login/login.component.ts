import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule], // Removido HttpClientModule
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    usuario: '',
    password: ''
  };
  
  errorMessage = '';
  isLoading = false;
  showPassword = false; // Nueva propiedad


  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.login(this.credentials.usuario, this.credentials.password)
        .subscribe({
          next: () => {
            this.isLoading = false;
          },
          error: (error) => {
            this.isLoading = false;
            if (error.status === 401) {
              this.errorMessage = 'Usuario o contraseña incorrectos';
            } else if (error.status === 403) {
              this.errorMessage = 'Por favor verifica tu cuenta antes de iniciar sesión';
            } else {
              this.errorMessage = 'Error al iniciar sesión. Por favor intenta más tarde';
            }
          }
        });
    }
  }

  recuperar() {
    this.router.navigate(['/recuperar']);
  }

  singup() {
    this.router.navigate(['/signup']);
  }
}