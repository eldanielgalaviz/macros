import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common'

interface MacroTotals {
  proteinas_totales: number;
  carbohidratos_totales: number;
  grasas_totales: number;
  calorias_totales: number;
}

interface Alimento {
  id: number;
  nombre: string;
  porcion: number;
  tipo_porcion: string;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  calorias: number;
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

interface RegistroComida {
  id: number;
  numero_comida: number;
  alimento: string;
  cantidad: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  calorias: number;
}

interface User {
  id: number;
  usuario: string;
  rol: number;
  correo: string;
  nombre: string;
  apellidopaterno: string;
  apellidomaterno: string;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})

export class CalendarComponent implements OnInit {
  selectedDate: Date = new Date();
  selectedDay: string = this.formatDate(this.selectedDate);
  currentWater: number = 0;
  maxWater: number = 3250;
  increment: number = 250;
  userId: number | null = null;
  currentUser: User | null = null;
  cantidadComidas: number = 3;
  comidas: { [key: number]: any[] } = {};
  alimentos: Alimento[] = [];
  alimentosFiltrados: Alimento[] = [];
  busquedaAlimento: string = '';
  cantidadSeleccionada: number = 1;
  comidaSeleccionada: number = 0;
  modalVisible: boolean = false;
  cantidades: { [key: number]: number } = {};

  showAlert: boolean = false;
  alertMessage: string = '';
  alertType: 'success' | 'error' = 'success';
  
  macroTotals: MacroTotals = {
    proteinas_totales: 0,
    carbohidratos_totales: 0,
    grasas_totales: 0,
    calorias_totales: 0
  };

  userRequerimentoCalorico: number = 2000; // Valor por defecto

  macroRequirements: MacroRequirements = {
    calorias_totales: 0,
    proteinas: { gramos: 0, calorias: 0, porcentaje: 0 },
    grasas: { gramos: 0, calorias: 0, porcentaje: 0 },
    carbohidratos: { gramos: 0, calorias: 0, porcentaje: 0 }
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.currentUser = user;
        this.userId = user.id;
        this.loadUserSettings(user.id);
        this.loadRegistrosComidas(this.formatDateForApi(this.selectedDate));
        this.loadMacroRequirements(user.id);
      }
    });
  }

  private loadMacroRequirements(userId: number) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<MacroRequirements>(`http://localhost:5000/usuarios/${userId}/requerimientos`, { headers })
      .subscribe({
        next: (requirements) => {
          this.macroRequirements = requirements;
        },
        error: (error) => console.error('Error loading macro requirements:', error)
      });
  }

  
  cargarAlimentos() {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<Alimento[]>('http://localhost:5000/alimentos', { headers })
      .subscribe({
        next: (alimentos) => {
          this.alimentos = alimentos;
          this.alimentosFiltrados = alimentos;
        },
        error: (error) => console.error('Error cargando alimentos:', error)
      });
  }

  filtrarAlimentos() {
    if (!this.busquedaAlimento.trim()) {
      this.alimentosFiltrados = this.alimentos;
      return;
    }

    const busqueda = this.busquedaAlimento.toLowerCase().trim();
    this.alimentosFiltrados = this.alimentos.filter(alimento => 
      alimento.nombre.toLowerCase().includes(busqueda)
    );
  }

  abrirModalAlimentos(numeroComida: number) {
    this.comidaSeleccionada = numeroComida;
    this.cargarAlimentos();
    this.modalVisible = true;
  }

  agregarAlimento(alimento: Alimento) {
    const cantidad = this.cantidades[alimento.id];
    if (!cantidad || cantidad <= 0) return;

    const data = {
      alimento_id: alimento.id,
      fecha: this.formatDateForApi(this.selectedDate),
      cantidad: cantidad,
      numero_comida: this.comidaSeleccionada
    };

    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);

    this.http.post('http://localhost:5000/registrar-comida', data, { headers })
      .subscribe({
        next: () => {
          delete this.cantidades[alimento.id];
          this.loadRegistrosComidas(this.formatDateForApi(this.selectedDate));
          this.showSuccessAlert(`${alimento.nombre} añadido correctamente`);
        },
        error: (error) => {
          console.error('Error al registrar comida:', error);
          this.showErrorAlert(error.error.message || 'Error al registrar el alimento');
        }
      });
  }

  editarCantidad(registro: any) {
    const nuevaCantidad = prompt('Ingrese la nueva cantidad:', registro.cantidad);
    if (nuevaCantidad === null) return;
    
    const cantidad = parseFloat(nuevaCantidad);
    if (isNaN(cantidad) || cantidad <= 0) {
      alert('Por favor ingrese una cantidad válida');
      return;
    }
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.put(`http://localhost:5000/actualizar-comida/${registro.id}`, 
      { cantidad: cantidad }, 
      { headers })
      .subscribe({
        next: () => {
          this.loadRegistrosComidas(this.formatDateForApi(this.selectedDate));
          this.showSuccessAlert('Cantidad actualizada correctamente');
        },
        error: (error) => {
          console.error('Error al actualizar cantidad:', error);
          this.showErrorAlert(error.error.message || 'Error al actualizar la cantidad');
        }
      });
  }

  eliminarAlimento(registroId: number) {
    if (!confirm('¿Está seguro de eliminar este alimento?')) return;
  
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.delete(`http://localhost:5000/eliminar-comida/${registroId}`, 
      { headers })
      .subscribe({
        next: () => {
          this.loadRegistrosComidas(this.formatDateForApi(this.selectedDate));
          this.showSuccessAlert('Alimento eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar alimento:', error);
          this.showErrorAlert(error.error.message || 'Error al eliminar el alimento');
        }
      });
  }



  private showSuccessAlert(message: string) {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
    setTimeout(() => this.showAlert = false, 3000);
  }

  private showErrorAlert(message: string) {
    this.alertMessage = message;
    this.alertType = 'error';
    this.showAlert = true;
    setTimeout(() => this.showAlert = false, 3000);
  }

  cerrarModal() {
    this.modalVisible = false;
    this.cantidadSeleccionada = 1;
    this.busquedaAlimento = '';
    this.alimentosFiltrados = this.alimentos;
  }



  getProteinProgress(): number {
    if (!this.macroRequirements.proteinas.gramos) return 0;
    return (this.macroTotals.proteinas_totales / this.macroRequirements.proteinas.gramos) * 100;
  }

  getCarbsProgress(): number {
    if (!this.macroRequirements.carbohidratos.gramos) return 0;
    return (this.macroTotals.carbohidratos_totales / this.macroRequirements.carbohidratos.gramos) * 100;
  }

  getFatsProgress(): number {
    if (!this.macroRequirements.grasas.gramos) return 0;
    return (this.macroTotals.grasas_totales / this.macroRequirements.grasas.gramos) * 100;
  }

  getCaloriesProgress(): number {
    if (!this.macroRequirements.calorias_totales) return 0;
    return (this.macroTotals.calorias_totales / this.macroRequirements.calorias_totales) * 100;
  }

  private loadUserSettings(userId: number) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`http://localhost:5000/usuarios/${userId}`, { headers }).subscribe({
      next: (userData) => {
        this.maxWater = userData.requerimentoagua || 3250;
        this.cantidadComidas = userData.cantidad_comidas || 3;
        this.userRequerimentoCalorico = userData.requerimientocalorico || 2000; // Agregar esta línea
        this.initializeComidas();
      },
      error: (error) => console.error('Error loading user settings:', error)
    });
  }


  private loadRegistrosComidas(fecha: string) {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${this.authService.getToken()}`);
    this.http.get<any>(`http://localhost:5000/resumen-diario/${fecha}`, { headers })
      .subscribe({
        next: (data) => {
          this.initializeComidas();
          data.desglose_por_alimento.forEach((registro: RegistroComida) => {
            if (!this.comidas[registro.numero_comida]) {
              this.comidas[registro.numero_comida] = [];
            }
            this.comidas[registro.numero_comida].push(registro);
          });
          this.macroTotals = data.totales_del_dia;
        },
        error: (error) => console.error('Error loading registros:', error)
      });
  }
 

  private initializeComidas() {
    this.comidas = {};
    for (let i = 1; i <= this.cantidadComidas; i++) {
      this.comidas[i] = [];
    }
  }

  getNombreComida(numeroComida: number): string {
    return `Comida ${numeroComida}`;
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  tieneAlimentos(numeroComida: number): boolean {
    return Array.isArray(this.comidas[numeroComida]) && this.comidas[numeroComida].length > 0;
  }

  onAgregarAlimento(numeroComida: number) {
    localStorage.setItem('selectedDate', this.formatDateForApi(this.selectedDate));
    localStorage.setItem('numeroComida', numeroComida.toString());
    this.router.navigate(['/añadir']);
  }

  prev(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDay = this.formatDate(this.selectedDate);
    this.loadRegistrosComidas(this.formatDateForApi(this.selectedDate));
  }

  next(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDay = this.formatDate(this.selectedDate);
    this.loadRegistrosComidas(this.formatDateForApi(this.selectedDate));
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  private formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  calculateMacroPercentage(value: number, total: number): number {
    if (!total) return 0;
    const percentage = (value / total) * 100;
    return Math.min(percentage, 100); // Para asegurar que no supere el 100%
  }


  calculateCaloriePercentage(): number {
    if (!this.userRequerimentoCalorico) return 0;
    const percentage = (this.macroTotals.calorias_totales / this.userRequerimentoCalorico) * 100;
    return Math.min(percentage, 100); // Para asegurar que no supere el 100%
  }

  getTotalMacros(): number {
    return this.macroTotals.proteinas_totales + 
           this.macroTotals.carbohidratos_totales + 
           this.macroTotals.grasas_totales;
  }

  increaseWater(): void {
    this.currentWater = Math.min(this.currentWater + this.increment, this.maxWater);
  }

  decreaseWater(): void {
    this.currentWater = Math.max(this.currentWater - this.increment, 0);
  }

  getWaterPercentage(): number {
    return (this.currentWater / this.maxWater) * 100;
  }
}