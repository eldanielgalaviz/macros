import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent {
  selectedDate: Date = new Date();
  selectedDay: string = this.formatDate(this.selectedDate);

  onDateChange(event: any): void {
    const date = event.value;
    if (date) {
      this.selectedDate = date;
      this.selectedDay = this.formatDate(this.selectedDate);
    }
  }

  prev(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() - 1);
    this.selectedDay = this.formatDate(this.selectedDate);
  }

  next(): void {
    this.selectedDate.setDate(this.selectedDate.getDate() + 1);
    this.selectedDay = this.formatDate(this.selectedDate);
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  currentWater: number = 0; // Cantidad actual de agua consumida
  maxWater: number = 3250; // Límite máximo de agua (ml)
  increment: number = 250; // Incremento en ml

  increaseWater(): void {
    if (this.currentWater + this.increment <= this.maxWater) {
      this.currentWater += this.increment;
    } else {
      this.currentWater = this.maxWater; // Asegurarse de no superar el máximo
    }
  }

  decreaseWater(): void {
    if (this.currentWater - this.increment >= 0) {
      this.currentWater -= this.increment;
    } else {
      this.currentWater = 0; // Asegurarse de no caer por debajo de 0
    }
  }
}
