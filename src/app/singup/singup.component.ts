import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-singup',
  standalone: true,
  imports: [ FormsModule],
  templateUrl: './singup.component.html',
  styleUrls: ['./singup.component.css'] // Cambié a 'styleUrls'
})
export class SingupComponent {
  constructor(private router: Router) {}

  singup(form: NgForm) {
    this.router.navigate(['/home']);
  }
}
