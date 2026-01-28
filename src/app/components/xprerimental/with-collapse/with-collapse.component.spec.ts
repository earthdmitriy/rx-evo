import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WithCollapseComponent } from './with-collapse.component';

describe('WithCollapseComponent', () => {
  let component: WithCollapseComponent;
  let fixture: ComponentFixture<WithCollapseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithCollapseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WithCollapseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
