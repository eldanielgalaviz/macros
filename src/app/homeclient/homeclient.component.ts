import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule, Location } from '@angular/common';

interface PatientInfo {
  id: number;
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
  peso: number;
  estatura: number;
  edad: number;
  sexo: string;
  actividad: string;
  objetivo: string;
  cantidad_comidas: number;
  metabolismobasal?: number;
  imc?: number;
  requerimentoagua?: number;
  requerimientocalorico?: number;
}

interface MedicalRecord {
  usuario_id: number;
  fecha: string;
  peso: number;
  imc: number;
  observaciones?: string;
}

@Component({
  selector: 'app-homeclient',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './homeclient.component.html',
  styleUrls: ['./homeclient.component.css']
})
export class HomeclientComponent implements OnInit {
  patientInfo: PatientInfo = {
    id: 0,
    nombre: '',
    apellidopaterno: '',
    apellidomaterno: '',
    peso: 0,
    estatura: 0,
    edad: 0,
    sexo: 'm',
    actividad: 'baja',
    objetivo: 'mantener',
    cantidad_comidas: 3
  };
  isEditing = false;
  showSuccessMessage = false;
  showErrorMessage = false;
  messageText = '';
  patientId: number | null=null
  observaciones: string = ''; 

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private location:Location,
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      console.log('ID del paciente:', this.patientId);
      if (this.patientId) {
        this.loadPatientInfo();
      } else {
        console.error('El ID del paciente es inválido:', this.patientId);
      }
    });
  }
  

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  loadPatientInfo() {
    if (!this.patientId) return;

    const options = { headers: this.getHeaders() };
    
    this.http.get<PatientInfo>(`http://localhost:5000/usuarios/${this.patientId}`, options).subscribe({
      next: (data) => {
        this.patientInfo = {...this.patientInfo, ...data};
      },
      error: (error) => {
        this.showMessage('Error al cargar los datos del paciente', true);
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.loadPatientInfo();
      this.observaciones = ''; // Limpiar las observaciones al cancelar
    }
  }

  async saveChanges() {
    if (!this.patientId) return;

    const options = { headers: this.getHeaders() };
    
    const dataToSend = {
      peso: Number(this.patientInfo.peso),
      estatura: Number(this.patientInfo.estatura),
      edad: Number(this.patientInfo.edad),
      sexo: this.patientInfo.sexo,
      actividad: this.patientInfo.actividad,
      objetivo: this.patientInfo.objetivo,
      cantidad_comidas: Number(this.patientInfo.cantidad_comidas)
    };

    try {
      // 1. Actualizar la información del paciente
      const response = await this.http.put(`http://localhost:5000/personal-info/update/${this.patientId}`, dataToSend, options).toPromise();

      // 2. Crear el registro médico
      const altura_metros = this.patientInfo.estatura / 100;
      const imc = this.patientInfo.peso / (altura_metros * altura_metros);
      
      const medicalRecord: MedicalRecord = {
        usuario_id: this.patientId,
        fecha: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        peso: this.patientInfo.peso,
        imc: imc,
        observaciones: this.observaciones || 'Actualización rutinaria de datos'
      };

      // Realizar la petición POST para crear el registro médico
      await this.http.post(`http://localhost:5000/registros-medicos`, medicalRecord, options).toPromise();

      this.showMessage('Datos del paciente y registro médico actualizados correctamente', false);
      this.isEditing = false;
      this.observaciones = ''; // Limpiar las observaciones
      this.loadPatientInfo();

    } catch (error: any) {
      console.error('Error al actualizar:', error);
      this.showMessage(error.error?.message || 'Error al actualizar los datos', true);
    }
  }

  showMessage(message: string, isError: boolean) {
    this.messageText = message;
    if (isError) {
      this.showErrorMessage = true;
      this.showSuccessMessage = false;
    } else {
      this.showErrorMessage = false;
      this.showSuccessMessage = true;
    }
    setTimeout(() => {
      this.showErrorMessage = false;
      this.showSuccessMessage = false;
    }, 3000);
  }

  goBack() {
    this.location.back();
  }

  // Métodos de navegación
  alimentos() {
    this.router.navigate(['/alimentos']);
  }

  recetas() {
    this.router.navigate(['/recetas']);
  }

  home() {
    this.router.navigate(['/macros']);
  }

  anadir() {
    this.router.navigate(['/añadir']);
  }

  cuenta() {
    this.router.navigate(['/cuenta']);
  }
}