import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { ObjetivoService } from '../objetivo.service';

@Component({
  selector: 'app-objetivos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './objetivos.component.html',
  styleUrls: ['./objetivos.component.css']
})
export class ObjetivosComponent implements OnInit {
  selectedObjetivo: string = ''; // Propiedad para almacenar el objetivo seleccionado

  constructor(private objetivoService: ObjetivoService, private router: Router) {}

  ngOnInit() {
    // Suscripción a los cambios en currentObjetivo
    this.objetivoService.currentObjetivo.subscribe((objetivo) => {
      this.selectedObjetivo = objetivo;
    });
  }

  onActivityChange(objetivo: string): void {
    this.objetivoService.changeObjetivo(objetivo);
    this.router.navigate(['/macros']);
  }

  prev(): void {
    this.router.navigate(['/macros']);
  }
}
