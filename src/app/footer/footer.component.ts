import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  constructor(private router: Router) {}

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