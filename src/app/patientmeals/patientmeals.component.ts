import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pipe, PipeTransform } from '@angular/core';

interface PatientInfo {
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
}

interface MacroTotals {
  proteinas_totales: number;
  carbohidratos_totales: number;
  grasas_totales: number;
  calorias_totales: number;
}

@Pipe({
  name: 'dateEs',
  standalone: true
})
export class DateEsPipe implements PipeTransform {
  transform(date: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
  }
}
@Component({
  selector: 'app-patient-meals',
  standalone: true,
  imports: [CommonModule, FormsModule, DateEsPipe],
  templateUrl: './patientmeals.component.html',
  styleUrls : ['./patientmeals.component.css'],
})


export class PatientMealsComponent implements OnInit {
  patientId: number = 0;
  patientInfo: PatientInfo | null = null;
  selectedDate: Date = new Date();
  currentWater: number = 0;  // Añadimos esta propiedad
  maxWater: number = 3250;   // También podemos añadir el máximo
  macroTotals: MacroTotals = {
    proteinas_totales: 0,
    carbohidratos_totales: 0,
    grasas_totales: 0,
    calorias_totales: 0
  };
  comidas: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      this.loadPatientInfo();
      this.loadMealData();
    });
  }

  loadPatientInfo() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<PatientInfo>(`http://localhost:5000/usuarios/${this.patientId}`, { headers })
      .subscribe({
        next: (data) => this.patientInfo = data,
        error: (error) => console.error('Error loading patient info:', error)
      });
  }

  loadMealData() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    const dateStr = this.formatDateForApi(this.selectedDate);
    
    // Modificar la URL para incluir el ID del paciente
    this.http.get<any>(`http://localhost:5000/resumen-diario/${this.patientId}/${dateStr}`, { headers })
      .subscribe({
        next: (data) => {
          this.macroTotals = data.totales_del_dia;
          this.organizarComidas(data.desglose_por_alimento);
        },
        error: (error) => console.error('Error loading meal data:', error)
      });

    // Añadir la carga de agua
    this.http.get<any>(`http://localhost:5000/agua-diaria/${this.patientId}/${dateStr}`, { headers })
      .subscribe({
        next: (data) => {
          this.currentWater = data.cantidad;
        },
        error: (error) => console.error('Error loading water data:', error)
      });
}

  organizarComidas(desglose: any[]) {
    // Organizar alimentos por número de comida
    const comidasMap = new Map();
    desglose.forEach(registro => {
      if (!comidasMap.has(registro.numero_comida)) {
        comidasMap.set(registro.numero_comida, {
          nombre: `Comida ${registro.numero_comida}`,
          alimentos: []
        });
      }
      comidasMap.get(registro.numero_comida).alimentos.push(registro);
    });

    this.comidas = Array.from(comidasMap.values());
  }

  prevDay() {
    // Crear una nueva instancia de Date
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() - 1));
    this.loadMealData();
}

nextDay() {
    // Crear una nueva instancia de Date
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() + 1));
    this.loadMealData();
}

  getPercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  getTotalMacros(): number {
    return this.macroTotals.proteinas_totales + 
           this.macroTotals.carbohidratos_totales + 
           this.macroTotals.grasas_totales;
  }

  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}