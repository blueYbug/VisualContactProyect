import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TecladoPage } from './teclado.page';

describe('TecladoPage', () => {
  let component: TecladoPage;
  let fixture: ComponentFixture<TecladoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TecladoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
