// patient-history.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

interface RegistroMedico {
  fecha: string;
  peso: number;
  imc: number;
  observaciones: string;
}

interface PatientInfo {
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
  // Agrega otros campos según necesites
}

interface ResumenComida {
  semana: string;
  proteinas_promedio: number;
  carbohidratos_promedio: number;
  grasas_promedio: number;
  calorias_promedio: number;
}
@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-history.component.html',
  styleUrls: ['./patient-history.component.css'], 
})
export class PatientHistoryComponent implements OnInit {
  @ViewChild('weightChart') weightChartRef!: ElementRef;

  patientId: number = 0;
  registrosMedicos: RegistroMedico[] = [];
  resumenComidas: ResumenComida[] = [];
  weightChart: Chart | null = null;
  errorMessage: string = '';
  patientInfo: PatientInfo | null = null;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      console.log('Patient ID:', this.patientId); // Debug
      this.loadPatientInfo();
      this.loadHistorial();
    });
  }

  ngAfterViewInit() {
    if (this.registrosMedicos.length > 0) {
      this.initWeightChart();
    }
  }

  loadPatientInfo() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`http://localhost:5000/usuarios/${this.patientId}`, { headers })
      .subscribe({
        next: (data) => {
          console.log('Patient data received:', data); // Debug
          this.patientInfo = data;
        },
        error: (error) => {
          console.error('Error loading patient info:', error); // Debug
          // Mostrar mensaje de error al usuario
          // this.errorMessage = 'Error al cargar la información del paciente';
        }
      });
  } 

  loadHistorial() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`http://localhost:5000/personal-info/historial/${this.patientId}`, { headers })
      .subscribe({
        next: (data) => {
          console.log('History data received:', data); // Debug
          this.registrosMedicos = data.registros_medicos;
          this.resumenComidas = data.resumen_comidas;
          this.initWeightChart();
        },
        error: (error) => {
          console.error('Error loading historial:', error); // Debug
          // Mostrar mensaje de error al usuario
          // this.errorMessage = 'Error al cargar el historial';
        }
      });
  }

  initWeightChart() {
    const ctx = this.weightChartRef.nativeElement.getContext('2d');
    const dates = this.registrosMedicos.map(reg => reg.fecha);
    const weights = this.registrosMedicos.map(reg => reg.peso);

    if (this.weightChart) {
      this.weightChart.destroy();
    }

    this.weightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: 'Peso (kg)',
          data: weights,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
  }

  generateReport() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.post(
      `http://localhost:5000/generar-reporte/${this.patientId}`,
      {},
      { 
        headers,
        responseType: 'blob' 
      }
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reporte_${this.patientId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => console.error('Error generating report:', error)
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}