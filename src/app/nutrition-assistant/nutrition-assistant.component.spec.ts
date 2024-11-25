import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NutritionAssistantComponent } from './nutrition-assistant.component';

describe('NutritionAssistantComponent', () => {
  let component: NutritionAssistantComponent;
  let fixture: ComponentFixture<NutritionAssistantComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NutritionAssistantComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NutritionAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
