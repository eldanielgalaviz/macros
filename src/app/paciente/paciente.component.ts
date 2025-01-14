import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-paciente',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './paciente.component.html',
  styleUrls: ['./paciente.component.css']
})
export class PacienteComponent {
  constructor(private router: Router) {}

  singup(form: NgForm) {
    this.router.navigate(['/home']);
  }
}