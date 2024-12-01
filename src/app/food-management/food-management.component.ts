import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/services/auth.service';
import { Router } from '@angular/router';

interface Food {
  id: number;
  nombre: string;
  porcion: number;
  tipo_porcion: string;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  calorias: number;
}

@Component({
  selector: 'app-food-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './food-management.component.html',
  styleUrls: ['./food-management.component.css']
})
export class FoodManagementComponent implements OnInit {
  foods: Food[] = [];
  filteredFoods: Food[] = [];
  searchTerm: string = '';
  showModal = false;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  editingFood: Food | null = null;
  currentUser: any = null;

  newFood: Food = {
    id: 0,
    nombre: '',
    porcion: 0,
    tipo_porcion: 'gramos',
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0,
    calorias: 0
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
    this.loadFoods();
  }

  filterFoods() {
    if (!this.searchTerm.trim()) {
      this.filteredFoods = [...this.foods];
      return;
    }

    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredFoods = this.foods.filter(food => 
      food.nombre.toLowerCase().includes(searchTermLower)
    );
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => console.error('Error loading user:', error)
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getToken()}`
    });
  }

  loadFoods() {
    const options = { headers: this.getHeaders() };
    this.http.get<Food[]>('http://localhost:5000/alimentos', options).subscribe({
      next: (foods) => {
        this.foods = foods;
        this.filteredFoods = [...foods];
      },
      error: (error) => {
        console.error('Error loading foods:', error);
        this.errorMessage = 'Error al cargar los alimentos';
      }
    });
  }

  

  openCreateModal() {
    this.editingFood = null;
    this.newFood = {
      id: 0,
      nombre: '',
      porcion: 0,
      tipo_porcion: 'gramos',
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      calorias: 0
    };
    this.showModal = true;
  }

  openEditModal(food: Food) {
    this.editingFood = food;
    this.newFood = { ...food };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingFood = null;
    this.newFood = {
      id: 0,
      nombre: '',
      porcion: 0,
      tipo_porcion: 'gramos',
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      calorias: 0
    };
  }

  saveFood() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    const options = { headers: this.getHeaders() };
  
    const request = this.editingFood
      ? this.http.put<any>(`http://localhost:5000/alimentos/${this.editingFood.id}`, {
          nombre: this.newFood.nombre,
          porcion: this.newFood.porcion,
          tipo_porcion: this.newFood.tipo_porcion,
          proteinas: this.newFood.proteinas,
          carbohidratos: this.newFood.carbohidratos,
          grasas: this.newFood.grasas,
          calorias: this.newFood.calorias
        }, options)
      : this.http.post<any>('http://localhost:5000/alimentos', this.newFood, options);
  
    request.subscribe({
      next: () => {
        this.successMessage = `Alimento ${this.editingFood ? 'actualizado' : 'creado'} exitosamente`;
        this.isLoading = false;
        setTimeout(() => {
          this.showModal = false;
          this.loadFoods();
          this.successMessage = '';
        }, 2000);
      },
      error: (error) => {
        console.error('Error:', error);
        this.errorMessage = `Error al ${this.editingFood ? 'actualizar' : 'crear'} el alimento`;
        this.isLoading = false;
        // Añadimos el timeout para el mensaje de error también
        setTimeout(() => {
          this.errorMessage = '';
        }, 2000);
      }
    });
  }
}