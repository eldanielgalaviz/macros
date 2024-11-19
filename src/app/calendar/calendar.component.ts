import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';

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
  patientId!: number;
  userId: number = 0;
  cantidadComidas: number = 0;
  comidas: string[] = [];
  proteinas: string[][] = [];
  grasas: string[][] = [];
  carbohidratos: string[][] = [];
  calorias: string[][] = [];
  nombreComidaPorCard: string[] = [];
  selectedDate: Date = new Date();
  selectedDay: string = this.formatDate(this.selectedDate);
  currentWater: number = 0;
  cantidadAgua: number = 0;
  maxWater: number = 0;
  increment: number = 0;
  token: string | null = '';
  user: any = {};
  consultarAlimentos: string[] = [];
  alimentosPorCard: string[][] = [];
  cardSeleccionado: number = -1;
  currentUser: User | null = null;

  // Arrays para almacenar más de un alimento por card y sus detalles
  proteinasPorCard: number[][] = [];
  carbohidratosPorCard: number[][] = [];
  grasasPorCard: number[][] = [];
  caloriasPorCard: number[][] = [];

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {

    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      if (user && user.id) {
        this.getCantidadComidas(user.id);
        this.getCantidadAgua(user.id);
      }
    });

    this.user = this.authService.getUser();
    console.log('Detalles del usuario:', this.user);

    if (this.user && this.user.id) {
      this.getCantidadComidas(this.user.id);
    } else {
      console.error('ID del usuario no disponible');
    }
    if (this.user && this.user.id) {
      this.getCantidadAgua(this.user.id);
    } else {
      console.error('ID del usuario no disponible');
    }
  }

  logout() {
    this.authService.logout();
  }

  getCantidadComidas(userId: number): void {
    const url = 'http://localhost:5000/get_cantidad_comidas';
    const data = { id: userId };
  
    this.http.post<any>(url, data).subscribe(
      (response) => {
        console.log('Cantidad de comidas recibida:', response.cantidad_comidas);
        this.cantidadComidas = response.cantidad_comidas;
  
        // Modificamos esta parte para numerar las comidas
        this.comidas = Array.from({ length: this.cantidadComidas }, (_, i) => `Comida ${i + 1}`);
      },
      (error) => {
        console.error('Error al obtener la cantidad de comidas', error);
      }
    );
  }

  getCantidadAgua(userId: number): void {
    const url = 'http://localhost:5000/get_cantidad_agua';
    const data = { id: userId };
  
    this.http.post<any>(url, data).subscribe(
      (response) => {
        console.log('Cantidad de agua recibida:', response.requerimentoagua);
  
        // Actualiza la cantidad de agua
        this.cantidadAgua = response.requerimentoagua;
  
        // Calcula los valores dependientes
        this.maxWater = this.cantidadAgua;
        this.increment = this.cantidadAgua / 5;
      },
      (error) => {
        console.error('Error al obtener la cantidad de agua:', error);
      }
    );
  }

  abrirModal(index: number): void {
    this.cardSeleccionado = index;
    this.consultar_alimento();
  }

  consultar_alimento(): void {
    const url = 'http://localhost:5000/consultar_alimentos';
    this.http.get<any>(url).subscribe(
      (response) => {
        console.log('Nombres de los alimentos recibidos:', response.nombres);
        this.consultarAlimentos = response.nombres;
      },
      (error) => {
        console.error('Error al obtener los alimentos', error);
      }
    );
  }



  
  seleccionarAlimento(alimento: string, alimentoIndex: number): void {
    if (this.cardSeleccionado === -1) {
      console.error('No hay un card seleccionado');
      return;
    }
  
    const url = `http://localhost:5000/get_alimento_detalles/${alimento}`;
  
    this.http.get<any>(url).subscribe(
      (response) => {
        console.log('Detalles del alimento:', response.detalle);
  
        const cardIndex = this.cardSeleccionado; // Aseguramos que usamos el índice correcto
  
        // Inicializa los arrays si no existen para el card actual
        if (!this.alimentosPorCard[cardIndex]) {
          this.alimentosPorCard[cardIndex] = [];
          this.proteinasPorCard[cardIndex] = [];
          this.carbohidratosPorCard[cardIndex] = [];
          this.grasasPorCard[cardIndex] = [];
          this.caloriasPorCard[cardIndex] = [];
        }
  
        // Agrega el alimento y sus propiedades al card correspondiente
        this.alimentosPorCard[cardIndex].push(alimento);
        this.proteinasPorCard[cardIndex].push(response.detalle.proteinas);
        this.carbohidratosPorCard[cardIndex].push(response.detalle.carbohidratos);
        this.grasasPorCard[cardIndex].push(response.detalle.grasas);
        this.caloriasPorCard[cardIndex].push(response.detalle.calorias);
  
        // Recalcular las sumas de valores
        this.sumatoriaValores(cardIndex);
  
        // Actualizar el nombre del card (opcional, reflejando el último alimento seleccionado)
        this.nombreComidaPorCard[cardIndex] = alimento;
  
        // Cerrar el modal después de seleccionar el alimento
        const modalElement = document.getElementById('staticBackdrop');
        if (modalElement) {
          (modalElement as any).classList.remove('show');
          modalElement.setAttribute('aria-hidden', 'true');
          modalElement.setAttribute('style', 'display: none;');
          document.body.classList.remove('modal-open');
          document.body.removeAttribute('style');
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) backdrop.remove();
        }
      },
      (error) => {
        console.error('Error al obtener los detalles del alimento', error);
      }
    );
  }
  calcularTotal(array: number[] | null | undefined): number {
    if (!array || array.length === 0) return 0;
    return array.reduce((acc, val) => acc + val, 0); // `reduce` siempre necesita un acumulador y un valor inicial.
  }
  
  
  

  rellenarCard(detalles: any, index: number): void {
    this.proteinas[index] = detalles.proteinas;
    this.carbohidratos[index] = detalles.carbohidratos;
    this.grasas[index] = detalles.grasas;
    this.calorias[index] = detalles.calorias;
  }

  sumatoriaValores(index: number): void {
    const proteinas = this.proteinasPorCard[index]?.reduce((sum, current) => sum + current, 0) || 0;
    const carbohidratos = this.carbohidratosPorCard[index]?.reduce((sum, current) => sum + current, 0) || 0;
    const grasas = this.grasasPorCard[index]?.reduce((sum, current) => sum + current, 0) || 0;
    const calorias = this.caloriasPorCard[index]?.reduce((sum, current) => sum + current, 0) || 0;
  
    // Actualiza solo los valores del card correspondiente
    this.proteinas[index] = [`Total: ${proteinas}`];
    this.carbohidratos[index] = [`Total: ${carbohidratos}`];
    this.grasas[index] = [`Total: ${grasas}`];
    this.calorias[index] = [`Total: ${calorias}`];
  }
  

  eliminarAlimento(indexCard: number, indexAlimento: number): void {
    if (this.alimentosPorCard[indexCard] && this.alimentosPorCard[indexCard][indexAlimento] !== undefined) {
      this.alimentosPorCard[indexCard].splice(indexAlimento, 1);
      this.proteinasPorCard[indexCard].splice(indexAlimento, 1);
      this.carbohidratosPorCard[indexCard].splice(indexAlimento, 1);
      this.grasasPorCard[indexCard].splice(indexAlimento, 1);
      this.caloriasPorCard[indexCard].splice(indexAlimento, 1);

      this.sumatoriaValores(indexCard);

      if (this.alimentosPorCard[indexCard].length === 0) {
        this.nombreComidaPorCard[indexCard] = 'Seleccionar Alimento';
      }
    } else {
      console.error('El alimento o el card no existen.');
    }
  }

  prev(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDay = this.formatDate(this.selectedDate);
  }

  next(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDay = this.formatDate(this.selectedDate);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  increaseWater(): void {
    this.currentWater = Math.min(this.currentWater + this.increment, this.maxWater);
  }

  decreaseWater(): void {
    this.currentWater = Math.max(this.currentWater - this.increment, 0);
  }
}
