import {
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  output,
} from '@angular/core';

@Directive({
  selector: '[appIntersectionobserver]',
})
export class IntersectionobserverDirective implements OnDestroy {
  public readonly isIntersecting = output<boolean>();

  private readonly el = inject(ElementRef);

  private hasInitialised: boolean = false;

  private readonly observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.isIntersecting && this.isIntersecting.emit(entry.isIntersecting);
    }
  });

  constructor() {
    this.observer.observe(this.el.nativeElement);
  }

  public ngOnDestroy(): void {
    this.observer.disconnect();
  }
}
