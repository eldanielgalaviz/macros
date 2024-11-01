import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { ActivityService } from '../activity.service';
import { ObjetivoService } from '../objetivo.service';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-homeclient',
  standalone: true,
  imports: [FormsModule,FooterComponent],
  templateUrl: './homeclient.component.html',
  styleUrls: ['./homeclient.component.css']
})
export class HomeclientComponent implements OnInit {
  activity: string = ''; // Inicialización con un valor por defecto
  objetivo: string = ''; // Declaración de la variable objetivo

  constructor(
    private router: Router,
    private activityService: ActivityService,
    private objetivoService: ObjetivoService // Inyección de objetivoService
  ) {}

  ngOnInit() {
    this.activityService.currentActivity.subscribe((activity) => {
      this.activity = activity;
    });

    this.objetivoService.currentObjetivo.subscribe((objetivo) => {
      this.objetivo = objetivo;
    });
  }

  goToNextComponent() {
    this.router.navigate(['/actividad']);
  }

  actividad() {
    this.router.navigate(['/actividad']);
  }

  objetivos() {
    this.router.navigate(['/objetivo']); // Ajuste de la ruta para objetivo
  }
  alimentos() {
    this.router.navigate(['/alimentos']); // Ajuste de la ruta para objetivo
  }
  recetas() {
    this.router.navigate(['/recetas']); // Ajuste de la ruta para objetivo
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
