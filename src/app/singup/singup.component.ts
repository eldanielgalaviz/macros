import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';

interface UserData {
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
  correo: string;
  edad: number;
  usuario: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-singup',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './singup.component.html',
  styleUrls: ['./singup.component.css']
})
export class SingupComponent {
  // Declaración de las propiedades
  userData: UserData = {
    nombre: '',
    apellidopaterno: '',
    apellidomaterno: '',
    correo: '',
    edad: 0,
    usuario: '',
    password: '',
    confirmPassword: ''
  };

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  singup(form: NgForm) {
    if (form.valid) {
      if (this.userData.password !== this.userData.confirmPassword) {
        this.errorMessage = 'Las contraseñas no coinciden';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      // Excluir confirmPassword antes de enviar
      const { confirmPassword, ...registrationData } = this.userData;

      this.authService.register(registrationData)
        .subscribe({
          next: (response) => {
            this.isLoading = false;
            this.successMessage = response.message;
            // Esperar 2 segundos antes de redireccionar
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          },
          error: (error) => {
            this.isLoading = false;
            if (error.status) {
              this.errorMessage = error.message;
            } else {
              this.errorMessage = 'Error en el registro. Por favor intenta más tarde.';
            }
          }
        });
    }
  }

  cancel() {
    this.router.navigate(['/login']);
  }
}