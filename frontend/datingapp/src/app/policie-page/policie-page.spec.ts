import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoliciePage } from './policie-page';

describe('PoliciePage', () => {
  let component: PoliciePage;
  let fixture: ComponentFixture<PoliciePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoliciePage],
    }).compileComponents();

    fixture = TestBed.createComponent(PoliciePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
