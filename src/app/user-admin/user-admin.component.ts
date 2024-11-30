import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';

interface User {
  id: number;
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
  usuario: string;
  correo: string;
  rol: number;
  verificado: boolean;
  password?: string;
}

@Component({
  selector: 'app-user-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-admin.component.html',
  styleUrls: ['./user-admin.component.css']
})
export class UserAdminComponent implements OnInit {
  @ViewChild('userForm', { static: false }) userForm?: NgForm;
  
  users: User[] = [];
  filteredUsers: User[] = [];
  searchTerm: string = '';
  roleFilter: string = '';
  verificationFilter: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  currentUser: any = null;
  showModal: boolean = false;
  editingUser: boolean = false;
  userModel: User = this.getEmptyUserModel();

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadUsers();
  }

  private getEmptyUserModel(): User {
    return {
      id: 0,
      nombre: '',
      apellidopaterno: '',
      apellidomaterno: '',
      usuario: '',
      correo: '',
      rol: 3,
      verificado: false
    };
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  filterUsers() {
    let filtered = [...this.users];

    if (this.searchTerm.trim()) {
      const searchTermLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.nombre.toLowerCase().includes(searchTermLower) ||
        user.apellidopaterno.toLowerCase().includes(searchTermLower) ||
        user.apellidomaterno.toLowerCase().includes(searchTermLower) ||
        user.usuario.toLowerCase().includes(searchTermLower) ||
        user.correo.toLowerCase().includes(searchTermLower)
      );
    }

    if (this.roleFilter) {
      filtered = filtered.filter(user => user.rol === parseInt(this.roleFilter));
    }

    if (this.verificationFilter) {
      filtered = filtered.filter(user => 
        user.verificado === (this.verificationFilter === 'true')
      );
    }

    this.filteredUsers = filtered;
  }

  openCreateUserModal() {
    this.editingUser = false;
    this.userModel = this.getEmptyUserModel();
    this.showModal = true;
  }

  editUser(user: User) {
    this.editingUser = true;
    this.userModel = { ...user };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.userModel = this.getEmptyUserModel();
    this.editingUser = false;
  }

  saveUser() {
    if (!this.userForm?.valid) {
      return;
    }
  
    const options = { headers: this.getHeaders() };
    const endpoint = this.editingUser ? 
      `http://localhost:5000/admin/users/${this.userModel.id}` :
      'http://localhost:5000/admin/users';
  
    // Si estamos editando
    if (this.editingUser) {
      // Enviar solo los campos necesarios para actualizar
      const updateData = {
        nombre: this.userModel.nombre,
        apellidopaterno: this.userModel.apellidopaterno,
        apellidomaterno: this.userModel.apellidomaterno,
        usuario: this.userModel.usuario,
        correo: this.userModel.correo,
        rol: this.userModel.rol
      };
  
      this.http.put(endpoint, updateData, options).subscribe({
        next: () => {
          this.successMessage = 'Usuario actualizado correctamente';
          this.loadUsers();
          this.closeModal();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error:', error);
          this.errorMessage = error.error.message || 'Error al actualizar el usuario';
          setTimeout(() => this.errorMessage = '', 3000);
        }
      });
    } else {
      // Si estamos creando un nuevo usuario
      const createData = {
        ...this.userModel,
        password: this.userModel.password || 'defaultPassword123'  // Asegurarnos de que siempre hay una contraseña
      };
  
      this.http.post(endpoint, createData, options).subscribe({
        next: () => {
          this.successMessage = 'Usuario creado correctamente';
          this.loadUsers();
          this.closeModal();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error:', error);
          this.errorMessage = error.error.message || 'Error al crear el usuario';
          setTimeout(() => this.errorMessage = '', 3000);
        }
      });
    }
  }

  toggleVerification(user: User) {
    const options = { headers: this.getHeaders() };
    
    this.http.put(`http://localhost:5000/admin/users/${user.id}/verify`, 
      { verificado: !user.verificado }, 
      options
    ).subscribe({
      next: () => {
        this.successMessage = `Usuario ${user.verificado ? 'desverificado' : 'verificado'} correctamente`;
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error:', error);
        this.errorMessage = 'Error al cambiar el estado de verificación';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  resetPassword(user: User) {
    if (!confirm(`¿Estás seguro de que deseas resetear la contraseña de ${user.nombre}?`)) {
      return;
    }

    const options = { headers: this.getHeaders() };
    
    this.http.post(`http://localhost:5000/admin/users/${user.id}/reset-password`, {}, options).subscribe({
      next: () => {
        this.successMessage = 'Se ha enviado un correo con la nueva contraseña';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error:', error);
        this.errorMessage = 'Error al resetear la contraseña';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  getRoleBadgeClass(rol: number): string {
    switch (rol) {
      case 1: return 'badge bg-danger';
      case 2: return 'badge bg-primary';
      case 3: return 'badge bg-success';
      default: return 'badge bg-secondary';
    }
  }

  // Mantener los métodos existentes
  loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user && user.rol !== 1) {
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        console.error('Error loading current user:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  loadUsers() {
    const options = { headers: this.getHeaders() };
    
    this.http.get<User[]>('http://localhost:5000/admin/users', options).subscribe({
      next: (users) => {
        this.users = users;
        this.filterUsers();
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Error al cargar los usuarios';
      }
    });
  }

  deleteUser(userId: number) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    const options = { headers: this.getHeaders() };
    
    this.http.delete(`http://localhost:5000/admin/users/${userId}`, options).subscribe({
      next: () => {
        this.successMessage = 'Usuario eliminado correctamente';
        this.loadUsers();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        console.error('Error deleting user:', error);
        this.errorMessage = 'Error al eliminar el usuario';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }

  getRoleName(rol: number): string {
    switch (rol) {
      case 1: return 'Administrador';
      case 2: return 'Médico';
      case 3: return 'Paciente';
      default: return 'Desconocido';
    }
  }

  logout() {
    this.authService.logout();
  }
}