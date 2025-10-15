import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecientesPage } from './recientes.page';

describe('RecientesPage', () => {
  let component: RecientesPage;
  let fixture: ComponentFixture<RecientesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecientesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
