// src/app/home/home.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';

interface User {
  id: number;
  usuario: string;
  rol: number;
  correo: string;
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
}

interface NewFood {
  nombre: string;
  porcion: number;
  tipo_porcion: string;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  calorias: number;
}

interface Patient {
  id: number;
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
  usuario: string;
  correo: string;
  edad: number;
  rol: number;
  peso?: number;
  estatura?: number;
  objetivo?: string;
  cantidad_comidas?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  patients: Patient[] = [];
  filteredPatients: Patient[] = [];
  searchTerm: string = '';
  currentUser: User | null = null;
  newPatient = {
    nombre: '',
    apellidopaterno: '',
    apellidomaterno: '',
    correo: '',
    edad: '',
    usuario: '',
    password: ''
  };
  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  showCreateFoodModal = false;
  isCreatingFood = false;
  newFood: NewFood = {
    nombre: '',
    porcion: 0,
    tipo_porcion: 'gramos',
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0,
    calorias: 0
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadPatients();
    this.authService.getCurrentUser().subscribe(user => {
      console.log('Current user data:', user); // Para debug
      this.currentUser = user;
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  loadPatients() {
    this.authService.getPatients().subscribe({
      next: (data) => {
        // Filtrar solo pacientes (rol 3) y asignar a ambos arreglos
        this.patients = data.filter(patient => patient.rol === 3);
        this.filteredPatients = [...this.patients];
      },
      error: (error) => {
        console.error('Error cargando pacientes:', error);
        this.errorMessage = 'Error al cargar la lista de pacientes';
      }
    });
  }

  // Método para buscar pacientes
  searchPatients() {
    if (!this.searchTerm.trim()) {
      // Si la búsqueda está vacía, mostrar todos los pacientes
      this.filteredPatients = [...this.patients];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredPatients = this.patients.filter(patient => 
      patient.nombre.toLowerCase().includes(term) ||
      patient.apellidopaterno.toLowerCase().includes(term) ||
      patient.apellidomaterno.toLowerCase().includes(term)
    );
  }

  onSubmit(form: NgForm) {
    if (form.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.authService.registerPatient(this.newPatient).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = 'Paciente registrado exitosamente';
          this.loadPatients(); // Recargar la lista de pacientes
          form.resetForm();
          
          const modal = document.getElementById('staticBackdrop');
          if (modal) {
            (window as any).bootstrap.Modal.getInstance(modal).hide();
          }
        },
        error: (error) => {
          this.isLoading = false;
          if (error.error?.message) {
            this.errorMessage = error.error.message;
          } else {
            this.errorMessage = 'Error al registrar el paciente';
          }
        }
      });
    }
  }

  // Método para ver detalles del paciente
  viewPatientDetails(patientId: number) {
    console.log('Navegando a detalles del paciente:', patientId); // Para debug
    this.router.navigate(['/edit-profile', patientId]);
  }

  viewPatientHistory(patientId: number) {
    this.router.navigate(['/patient-history', patientId]);
  }

  // Método para ver registro de comidas
  viewMealRecord(patientId: number) {
    // Aquí implementarás la navegación al registro de comidas
    this.router.navigate(['/patient', patientId, 'meals']);
  }

  logout() {
    this.authService.logout();
  }

  goToFoodManagement() {
    this.router.navigate(['/food-management']);
  }
}



