// patient-history.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-patient-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patient-history.component.html',
  styleUrls: ['./patient-history.component.css'], 
})
export class PatientHistoryComponent implements OnInit {
  @ViewChild('weightChart') weightChartRef!: ElementRef;
  patientId: number = 0;
  patientInfo: any = null;
  registrosMedicos: any[] = [];
  registrosMedicosFiltrados: any[] = [];
  resumenComidas: any[] = [];
  weightChart: any;
  fechaBusqueda: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      console.log('Patient ID:', this.patientId);
      this.loadPatientInfo();
      this.loadHistorial();
    });
  }

  loadPatientInfo() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`http://localhost:5000/usuarios/${this.patientId}`, { headers })
      .subscribe({
        next: (data) => {
          console.log('Patient data received:', data);
          this.patientInfo = data;
        },
        error: (error) => {
          console.error('Error loading patient info:', error);
        }
      });
  } 

  loadHistorial() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`http://localhost:5000/personal-info/historial/${this.patientId}`, { headers })
      .subscribe({
        next: (data) => {
          this.registrosMedicos = data.registros_medicos.sort((a: any, b: any) => {
            return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
          });
          this.registrosMedicosFiltrados = [...this.registrosMedicos];
          this.resumenComidas = data.resumen_comidas;
          this.initWeightChart();
        },
        error: (error) => {
          console.error('Error loading historial:', error);
        }
      });
  }

  filtrarRegistros() {
    if (!this.fechaBusqueda) {
      this.registrosMedicosFiltrados = [...this.registrosMedicos];
      return;
    }

    const fechaBusqueda = new Date(this.fechaBusqueda);
    
    this.registrosMedicosFiltrados = this.registrosMedicos.filter(registro => {
      const fechaRegistro = new Date(registro.fecha);
      return fechaRegistro.toISOString().split('T')[0] === fechaBusqueda.toISOString().split('T')[0];
    });
  }

  limpiarFiltro() {
    this.fechaBusqueda = '';
    this.registrosMedicosFiltrados = [...this.registrosMedicos];
  }
  initWeightChart() {
    const ctx = this.weightChartRef.nativeElement.getContext('2d');
    
    // Preparar los datos ordenados cronológicamente
    const dates = this.registrosMedicos.map(reg => {
      const fecha = new Date(reg.fecha);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    });
    
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
          tension: 0.1,
          fill: false
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Peso (kg)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Fecha'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Evolución del Peso'
          },
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });
  }

  generateReport() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.post(
      `http://localhost:5000/personal-info/generar-reporte/${this.patientId}`,
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