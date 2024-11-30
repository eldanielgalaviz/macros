import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RecuperarcComponent } from './recuperarc/recuperarc.component';
import { SingupComponent } from './singup/singup.component';
import { HomeComponent } from './home/home.component';
import { PacienteComponent } from './paciente/paciente.component';
import { HomeclientComponent } from './homeclient/homeclient.component';
import { ActividadComponent } from './actividad/actividad.component';
import { ObjetivosComponent } from './objetivos/objetivos.component';
import { AlimentosComponent } from './alimentos/alimentos.component';
import { RecetaComponent } from './receta/receta.component';
import { CalendarComponent } from './calendar/calendar.component';
import { MicuentaComponent } from './micuenta/micuenta.component';
import { ResetPasswordComponent } from './resetpassword/resetpassword.component';
import { DoctorGuard } from './guards/doctor.guard';
import { authGuard } from './auth/guards/auth.guard';
import { SettingsComponent } from './settings/settings.component';
import { PatientMealsComponent } from './patientmeals/patientmeals.component';
import { PatientHistoryComponent } from './patient-history/patient-history.component';
import { UserAdminComponent } from './user-admin/user-admin.component';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'recuperar', component: RecuperarcComponent },
  { path: 'signup', component: SingupComponent },
  { 
    path: 'home', 
    component: HomeComponent,
    canActivate: [DoctorGuard]  // Aquí se aplica el guard
  },
  { path: 'paciente', component: PacienteComponent },
  { 
    path: 'edit-profile/:id', 
    component: HomeclientComponent,
    canActivate: [authGuard]
  },
  { path: 'actividad', component: ActividadComponent },   
  { path: 'objetivo', component: ObjetivosComponent },
  { path: 'alimentos', component: AlimentosComponent },
  { path: 'recetas', component: RecetaComponent },
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'cuenta', component: MicuentaComponent },
  { path: 'resetpassword/:token', component: ResetPasswordComponent},
  { path: 'calendar', component: CalendarComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },

  {
    path: 'patient/:id/meals',
    component: PatientMealsComponent,
    canActivate: [DoctorGuard]
  },

  { 
    path: 'patient-history/:id', 
    component: PatientHistoryComponent,
    canActivate: [DoctorGuard]
  },
  {
    path: 'admin-users',
    component: UserAdminComponent,
    canActivate: [AdminGuard]
  },
  
  //{ path: 'reset_password/:token', component: VerifyTokenComponent },



  { path: '**', redirectTo: 'login' } // Ruta por defeto
];
