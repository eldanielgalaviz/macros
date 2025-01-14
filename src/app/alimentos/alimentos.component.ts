import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-alimentos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './alimentos.component.html',
  styleUrls: ['./alimentos.component.css']
})
export class AlimentosComponent {
  constructor( private router: Router){}

  save() {
    this.router.navigate(['/macros']); // Ajuste de la ruta para objetivo
  }
  prev() {
    this.router.navigate(['/macros']); // Ajuste de la ruta para objetivo
  }
  saveAlimento(form: NgForm) {
    this.router.navigate(['/home']);
  }
}
