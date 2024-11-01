import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';
import { FooterComponent } from '../footer/footer.component';


@Component({
  selector: 'app-micuenta',
  standalone: true,
  imports: [FormsModule,
    FooterComponent
  ],
  templateUrl: './micuenta.component.html',
  styleUrl: './micuenta.component.css'
})
export class MicuentaComponent {

constructor(private router: Router) {}

actualizar(form: NgForm) {
  this.router.navigate(['/home']);
}

prev() {
  this.router.navigate(['/macros']); // Reemplaza 'next-component' con la ruta deseada
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

