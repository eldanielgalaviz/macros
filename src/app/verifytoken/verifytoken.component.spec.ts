import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifytokenComponent } from './verifytoken.component';

describe('VerifytokenComponent', () => {
  let component: VerifytokenComponent;
  let fixture: ComponentFixture<VerifytokenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifytokenComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifytokenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
