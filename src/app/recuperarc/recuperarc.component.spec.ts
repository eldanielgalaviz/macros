import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecuperarcComponent } from './recuperarc.component';

describe('RecuperarcComponent', () => {
  let component: RecuperarcComponent;
  let fixture: ComponentFixture<RecuperarcComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecuperarcComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecuperarcComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
