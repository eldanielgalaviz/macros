import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  constructor(private router: Router) {}

  login(form: NgForm) {
    this.router.navigate(['/home']);
  }

  recuperar() {
    this.router.navigate(['/recuperar']);
  }

  singup() {
    this.router.navigate(['/signup']);
  }
}
