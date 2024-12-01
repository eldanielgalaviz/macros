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
  isGeneratingPdf: boolean = false;
  reportStartDate: string = '';
  reportEndDate: string = '';

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
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      this.reportEndDate = today.toISOString().split('T')[0];
      this.reportStartDate = lastMonth.toISOString().split('T')[0];
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
          // Ordenar los registros por fecha de manera ascendente
          this.registrosMedicos = data.registros_medicos.sort((a: any, b: any) => {
            return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
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
    
    // Revertir el orden de los datos para la visualización
    const reversedData = [...this.registrosMedicos].reverse();
    
    const dates = reversedData.map(reg => {
      const fecha = new Date(reg.fecha);
      return fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    });
    
    const weights = reversedData.map(reg => reg.peso);
  
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
        indexAxis: 'x',
        scales: {
          x: {
            position: 'bottom',
            reverse: true,  // Invertimos el eje X
            title: {
              display: true,
              text: 'Fecha'
            }
          },
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Peso (kg)'
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
    
    this.isGeneratingPdf = true;

    const params = {
      startDate: this.reportStartDate,
      endDate: this.reportEndDate
    };

    this.http.post(
      `http://localhost:5000/personal-info/generar-reporte/${this.patientId}`,
      params,
      { 
        headers,
        responseType: 'blob' 
      }
    ).subscribe({
      next: (blob) => {
        // Crear y descargar el archivo
        const fecha = new Date().toISOString().split('T')[0];
        const fileName = `reporte_paciente_${this.patientId}_${fecha}.pdf`;
        
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Desactivar indicador de carga
        this.isGeneratingPdf = false;
      },
      error: (error) => {
        console.error('Error generando el reporte:', error);
        this.isGeneratingPdf = false;
        alert('Error al generar el reporte. Por favor intente nuevamente.');
      }
    });
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}