import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FoodManagementComponent } from './food-management.component';

describe('FoodManagementComponent', () => {
  let component: FoodManagementComponent;
  let fixture: ComponentFixture<FoodManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FoodManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FoodManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
