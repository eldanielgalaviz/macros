// patient-history.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

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
  patientInfo: any = null;
  registrosMedicos: any[] = [];
  resumenComidas: any[] = [];
  weightChart: any;

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
    this.http.get<any>(`http://localhost:5000/historial/${this.patientId}`, { headers })
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