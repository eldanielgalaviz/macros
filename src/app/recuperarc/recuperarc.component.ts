import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recuperarc',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './recuperarc.component.html',
  styleUrls: ['./recuperarc.component.css']
})
export class RecuperarcComponent {
  email: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.authService.forgotPassword(this.email).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message;
          // Redirigir al login después de unos segundos
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message || 'Error al enviar el correo de recuperación';
        }
      });
    }
  }

  // Método para navegar al login
  goToLogin() {
    this.router.navigate(['/login']);
  }
}