import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { Component } from '@angular/core';
import { ActivityService } from '../activity.service';

@Component({
  selector: 'app-actividad',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './actividad.component.html',
  styleUrl: './actividad.component.css'
})
export class ActividadComponent {
  constructor(private activityService: ActivityService, private router: Router) {}

  onActivityChange(activity: string) {
    this.activityService.changeActivity(activity);
    this.router.navigate(['/macros']); // Asegúrate de que la ruta sea correcta
  }

  prev() {
    this.router.navigate(['/macros']); // Reemplaza 'next-component' con la ruta deseada
  }
}