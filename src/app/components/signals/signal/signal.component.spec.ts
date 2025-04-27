import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../../app.config';
import { EventBusService } from '../../../services/EventBus.service';
import { SignalComponent } from './signal.component';

describe('SignalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignalComponent],
      providers: [
        {
          provide: SKIPDELAY_TOKEN,
          useValue: true,
        },
        {
          provide: EventBusService,
          useValue: {
            throwClientApiError$: of(false),
            throwBucketApiError$: of(false),
            throwProductApiError$: of(false),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the SignalComponent', () => {
    const fixture = TestBed.createComponent(SignalComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it(`should populate client`, async () => {
    const fixture = TestBed.createComponent(SignalComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    const client = component.client();

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);
  });

  it(`should handle changing inputs`, async () => {
    const fixture = TestBed.createComponent(SignalComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const client = component.client();

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);

    fixture.componentRef.setInput('clientId', 2);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const newClient = component.client();

    expect(newClient).toBeTruthy();
    expect(newClient?.clientId).toBe(2);
  });
});
