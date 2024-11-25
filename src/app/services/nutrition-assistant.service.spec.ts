import { TestBed } from '@angular/core/testing';

import { NutritionAssistantService } from './nutrition-assistant.service';

describe('NutritionAssistantService', () => {
  let service: NutritionAssistantService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NutritionAssistantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
