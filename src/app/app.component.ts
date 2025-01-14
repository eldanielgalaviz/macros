import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RecuperarcComponent } from './recuperarc/recuperarc.component';
import { HomeComponent } from './home/home.component';
import { PacienteComponent } from './paciente/paciente.component';
import { HomeclientComponent } from './homeclient/homeclient.component';
import { ActividadComponent } from './actividad/actividad.component';
import { ObjetivosComponent } from './objetivos/objetivos.component';
import { AlimentosComponent } from './alimentos/alimentos.component';
import { RecetaComponent } from './receta/receta.component';
import { CalendarComponent } from './calendar/calendar.component';
import { FooterComponent } from './footer/footer.component';
import { MicuentaComponent } from './micuenta/micuenta.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoginComponent, 
  RecuperarcComponent,
  HomeComponent,
  PacienteComponent,
  HomeclientComponent,
  ActividadComponent,
  ObjetivosComponent,
  AlimentosComponent,
  RecetaComponent,
  CalendarComponent,
  FooterComponent,
  MicuentaComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'nutri';
}
