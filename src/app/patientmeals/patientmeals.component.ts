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
  cantidad_comidas: number;
}

interface MacroRequirements {
  calorias_totales: number;
  proteinas: {
    gramos: number;
    calorias: number;
    porcentaje: number;
  };
  grasas: {
    gramos: number;
    calorias: number;
    porcentaje: number;
  };
  carbohidratos: {
    gramos: number;
    calorias: number;
    porcentaje: number;
  };
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
  styleUrls: ['./patientmeals.component.css'],
})
export class PatientMealsComponent implements OnInit {
  patientId: number = 0;
  selectedDate: Date = new Date();
  cantidadComidas: number = 3;
  comidas: { [key: number]: any[] } = {};
  macroTotals: MacroTotals = {
    proteinas_totales: 0,
    carbohidratos_totales: 0,
    grasas_totales: 0,
    calorias_totales: 0
  };

  macroRequirements: MacroRequirements = {
    calorias_totales: 0,
    proteinas: { gramos: 0, calorias: 0, porcentaje: 0 },
    grasas: { gramos: 0, calorias: 0, porcentaje: 0 },
    carbohidratos: { gramos: 0, calorias: 0, porcentaje: 0 }
  };

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
      this.loadPatientInfo();
      this.loadMealData();
      this.loadMacroRequirements(); 
    });
  }

  loadPatientInfo() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<PatientInfo>(`http://localhost:5000/usuarios/${this.patientId}`, { headers })
      .subscribe({
        next: (data) => {
          this.patientInfo = data;
          this.cantidadComidas = data.cantidad_comidas;
          this.initializeComidas();
        },
        error: (error) => console.error('Error loading patient info:', error)
      });
  }

  loadMacroRequirements() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<MacroRequirements>(`http://localhost:5000/usuarios/${this.patientId}/requerimientos`, { headers })
      .subscribe({
        next: (requirements) => {
          this.macroRequirements = requirements;
        },
        error: (error) => console.error('Error loading macro requirements:', error)
      });
  }

  loadMealData() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    const dateStr = this.formatDateForApi(this.selectedDate);
    
    // Usamos la ruta correcta para obtener los datos
    this.http.get<any>(`http://localhost:5000/${this.patientId}/resumen-diario/${dateStr}`, { headers })
      .subscribe({
        next: (data) => {
          console.log('Datos recibidos:', data); // Para debugging
          this.macroTotals = data.totales_del_dia;
          this.organizarComidas(data.desglose_por_alimento);
        },
        error: (error) => console.error('Error loading meal data:', error)
      });
}

  private initializeComidas() {
    this.comidas = {};
    for (let i = 1; i <= this.cantidadComidas; i++) {
      this.comidas[i] = [];
    }
  }

  organizarComidas(desglose: any[]) {
    this.initializeComidas();
    desglose.forEach(registro => {
      if (!this.comidas[registro.numero_comida]) {
        this.comidas[registro.numero_comida] = [];
      }
      this.comidas[registro.numero_comida].push(registro);
    });
  }

  getNombreComida(numeroComida: number): string {
    return `Comida ${numeroComida}`;
  }

  tieneAlimentos(numeroComida: number): boolean {
    return Array.isArray(this.comidas[numeroComida]) && this.comidas[numeroComida].length > 0;
  }

  getMacrosPorComida(numeroComida: number): MacroTotals {
    const registros = this.comidas[numeroComida] || [];
    return registros.reduce((acc, registro) => ({
      proteinas_totales: acc.proteinas_totales + registro.proteinas,
      carbohidratos_totales: acc.carbohidratos_totales + registro.carbohidratos,
      grasas_totales: acc.grasas_totales + registro.grasas,
      calorias_totales: acc.calorias_totales + registro.calorias
    }), {
      proteinas_totales: 0,
      carbohidratos_totales: 0,
      grasas_totales: 0,
      calorias_totales: 0
    });
  }

  getPercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  getTotalMacros(): number {
    return this.macroTotals.proteinas_totales + 
           this.macroTotals.carbohidratos_totales + 
           this.macroTotals.grasas_totales;
  }

  prevDay() {
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() - 1));
    this.loadMealData();
  }

  nextDay() {
    this.selectedDate = new Date(this.selectedDate.setDate(this.selectedDate.getDate() + 1));
    this.loadMealData();
  }

  formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}