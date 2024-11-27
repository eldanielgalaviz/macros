import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NutritionAssistantService } from '../services/nutrition-assistant.service';

@Component({
  selector: 'app-nutrition-assistant',
  templateUrl: './nutrition-assistant.component.html',
  styleUrls: ['./nutrition-assistant.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class NutritionAssistantComponent {
  messages: {text: string, isUser: boolean}[] = [];
  userInput = '';
  isLoading = false;

  constructor(private nutritionService: NutritionAssistantService) {}

  async sendMessage() {
    if (!this.userInput.trim()) return;

    const userMessage = this.userInput;
    this.messages.push({text: userMessage, isUser: true});
    this.userInput = '';
    
    // Activar el spinner
    this.isLoading = true;

    try {
      const response = await this.nutritionService.getResponse(userMessage);
      this.messages.push({text: response, isUser: false});
    } catch (error) {
      console.error('Error:', error);
      this.messages.push({text: 'Lo siento, hubo un error. Por favor intenta de nuevo.', isUser: false});
    } finally {
      // Desactivar el spinner sin importar el resultado
      this.isLoading = false;
    }
  }
}