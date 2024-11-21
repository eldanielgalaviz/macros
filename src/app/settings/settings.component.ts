import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface UserSettings {
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
  edad: number;
  usuario: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settings: UserSettings = {
    nombre: '',
    apellidopaterno: '',
    apellidomaterno: '',
    edad: 0,
    usuario: ''
  };

  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  showAlert = false;
  alertMessage = '';
  alertType: 'success' | 'error' = 'success';
  loading = false;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUserSettings();
  }

  loadUserSettings() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<UserSettings>('http://localhost:5000/settings', { headers })
      .subscribe({
        next: (data) => this.settings = data,
        error: (error) => this.showMessage('Error al cargar los datos', 'error')
      });
  }

  updatePersonalInfo() {
    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    
    this.http.put('http://localhost:5000/settings', this.settings, { headers })
      .subscribe({
        next: () => {
          this.showMessage('Información actualizada correctamente', 'success');
          this.loading = false;
        },
        error: (error) => {
          this.showMessage(error.error.message || 'Error al actualizar', 'error');
          this.loading = false;
        }
      });
  }

  updatePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.showMessage('Las contraseñas no coinciden', 'error');
      return;
    }

    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    
    this.http.put('http://localhost:5000/settings', this.passwordData, { headers })
      .subscribe({
        next: () => {
          this.showMessage('Contraseña actualizada correctamente', 'success');
          this.passwordData = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          };
          this.loading = false;
        },
        error: (error) => {
          this.showMessage(error.error.message || 'Error al actualizar contraseña', 'error');
          this.loading = false;
        }
      });
  }

  private showMessage(message: string, type: 'success' | 'error') {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    setTimeout(() => this.showAlert = false, 3000);
  }
}
