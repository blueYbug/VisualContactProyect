import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartupPage } from './startup.page';

describe('StartupPage', () => {
  let component: StartupPage;
  let fixture: ComponentFixture<StartupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(StartupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
