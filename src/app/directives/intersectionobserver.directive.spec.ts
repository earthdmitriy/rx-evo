import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IntersectionobserverDirective } from './intersectionobserver.directive';

describe('IntersectionobserverDirective', () => {
  let originalIntersectionObserver: any;

  beforeEach(() => {
    // mock global IntersectionObserver so it doesn't try to use browser APIs in tests
    originalIntersectionObserver = (globalThis as any).IntersectionObserver;

    class MockIntersectionObserver {
      callback: any;
      constructor(cb: any) {
        this.callback = cb;
      }
      observe = jest.fn();
      disconnect = jest.fn();
    }

    (globalThis as any).IntersectionObserver = MockIntersectionObserver;

    // provide a mock ElementRef with a simple nativeElement stub
    const mockElementRef = { nativeElement: document.createElement('div') };

    TestBed.configureTestingModule({
      providers: [
        IntersectionobserverDirective,
        { provide: ElementRef, useValue: mockElementRef },
      ],
    });
  });

  afterEach(() => {
    // restore global
    (globalThis as any).IntersectionObserver = originalIntersectionObserver;
    jest.clearAllMocks();
  });

  it('should create an instance', () => {
    const directive = TestBed.inject(IntersectionobserverDirective);
    expect(directive).toBeTruthy();
  });
});
