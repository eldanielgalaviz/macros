import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './resetpassword.component.html',
  styleUrls: ['./resetpassword.component.css'] 
})
export class ResetPasswordComponent implements OnInit {
  passwords = {
    new_password: '',
    confirm_password: ''
  };
  
  token: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  redirecting: boolean = false;
  countdown: number = 3;
  private countdownInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  startRedirectCountdown() {
    this.redirecting = true;
    this.countdown = 3;
    
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown === 0) {
        clearInterval(this.countdownInterval);
        this.router.navigate(['/login']);
      }
    }, 1000);
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      if (this.passwords.new_password !== this.passwords.confirm_password) {
        this.errorMessage = 'Las contraseñas no coinciden';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.authService.resetPassword(this.token, this.passwords).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message;
          this.startRedirectCountdown();
        },
        error: (error) => {
          this.isLoading = false;
          if (error.status === 400) {
            this.errorMessage = 'El enlace ha expirado o es inválido';
          } else {
            this.errorMessage = error.message || 'Error al restablecer la contraseña';
          }
        }
      });
    }
  }
}