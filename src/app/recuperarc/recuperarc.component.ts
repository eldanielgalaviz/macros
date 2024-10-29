import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-recuperarc',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './recuperarc.component.html',
  styleUrl: './recuperarc.component.css'
})
export class RecuperarcComponent {
  constructor(private router: Router) {}

  login(form: NgForm) {
    this.router.navigate(['/login']);
  }

}
