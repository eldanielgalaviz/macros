import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-verifytoken',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verifytoken.component.html',
  styleUrl: './verifytoken.component.css'
})
export class VerifyTokenComponent implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Obtener el token de los parámetros y redirigir
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.router.navigate(['/reset_password'], { 
          queryParams: { token: params['token'] }
        });
      } else {
        this.router.navigate(['/login']);
      }
    });
  }
}
