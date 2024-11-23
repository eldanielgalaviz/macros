import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

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

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

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
    private authService: AuthService,
    private router: Router  // Añadir Router
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  updatePersonalInfo() {
    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    // Obtener el usuario actual del servicio de autenticación
    const currentUser = this.authService.getCurrentUser().subscribe(user => {
      const oldUsername = user?.usuario;  // Guardamos el usuario actual
      
      this.http.put('http://localhost:5000/settings/personal', this.settings, { headers })
        .subscribe({
          next: () => {
            this.showMessage('Información actualizada correctamente', 'success');
            this.loading = false;
            
            // Si el usuario cambió, cerrar sesión
            if (oldUsername && oldUsername !== this.settings.usuario) {
              setTimeout(() => {
                this.showMessage('El nombre de usuario ha cambiado. Por favor, inicie sesión nuevamente.', 'success');
                setTimeout(() => {
                  this.authService.logout();
                  this.router.navigate(['/login']);
                }, 2000);
              }, 1000);
            }
          },
          error: (error) => {
            this.showMessage(error.error.message || 'Error al actualizar', 'error');
            this.loading = false;
          }
        });
    });
  }

  updatePassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.showMessage('Las contraseñas no coinciden', 'error');
      return;
    }

    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    
    this.http.put('http://localhost:5000/settings/password', this.passwordData, { headers })
      .subscribe({
        next: () => {
          this.showMessage('Contraseña actualizada correctamente', 'success');
          this.loading = false;
          
          // Cerrar sesión después de cambiar la contraseña
          setTimeout(() => {
            this.showMessage('La contraseña ha sido actualizada. Por favor, inicie sesión nuevamente.', 'success');
            setTimeout(() => {
              this.authService.logout();
              this.router.navigate(['/login']);
            }, 2000);
          }, 1000);
        },
        error: (error) => {
          this.showMessage(error.error.message || 'Error al actualizar contraseña', 'error');
          this.loading = false;
        }
      });
  }

  // Actualizar el método showMessage para que no se oculte automáticamente si es un mensaje de cierre de sesión
  private showMessage(message: string, type: 'success' | 'error') {
    this.alertMessage = message;
    this.alertType = type;
    this.showAlert = true;
    
    // Solo ocultar automáticamente si no es un mensaje de cierre de sesión
    if (!message.includes('inicie sesión nuevamente')) {
      setTimeout(() => this.showAlert = false, 3000);
    }
  }
}
