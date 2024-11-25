import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class NutritionAssistantService {
  private genAI = new GoogleGenerativeAI(environment.GEMINI_API_KEY);
  private model = this.genAI.getGenerativeModel({ model: "gemini-pro" });

  async getResponse(prompt: string) {
    const context = "Eres un asistente nutricional experto. Ofrece consejos precisos y basados en evidencia científica.";
    const fullPrompt = `${context}\n\nUsuario: ${prompt}`;
    
    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }
}