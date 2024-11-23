import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientmealsComponent } from './patientmeals.component';

describe('PatientmealsComponent', () => {
  let component: PatientmealsComponent;
  let fixture: ComponentFixture<PatientmealsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientmealsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PatientmealsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
