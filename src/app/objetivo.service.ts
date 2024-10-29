import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ObjetivoService {
  private objetivoSource = new BehaviorSubject<string>(''); // Inicialmente vacío
  currentObjetivo = this.objetivoSource.asObservable();

  changeObjetivo(objetivo: string) {
    this.objetivoSource.next(objetivo);
  }
}
