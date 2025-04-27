import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../../app.config';
import { EventBusService } from '../../../services/EventBus.service';
import { TinyStoreComponent } from './tiny-store.component';

describe('TinyStoreComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TinyStoreComponent],
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

  it('should create the TinyStoreComponent', () => {
    const fixture = TestBed.createComponent(TinyStoreComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it(`should populate client`, async () => {
    const fixture = TestBed.createComponent(TinyStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    const client = component.clientStore.data();

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);
  });

  it(`should populate client loading`, async () => {
    const fixture = TestBed.createComponent(TinyStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);

    const loading = component.clientStore.loading();

    fixture.detectChanges();
    await fixture.whenStable();

    const client = component.clientStore.data();

    const newLoading = component.clientStore.loading();

    expect(client).toBeTruthy();
    expect(loading).toBe(true);
    expect(newLoading).toBe(false);
  });

  it(`loading materialize data`, async () => {
    const fixture = TestBed.createComponent(TinyStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);

    const loading = component.clientStore.loading();

    fixture.detectChanges();
    await fixture.whenStable();

    const newLoading = component.clientStore.loading();
    const client = component.clientStore.data();

    expect(client).toBeTruthy();
    expect(loading).toBe(true);
    expect(newLoading).toBe(false);
  });

  it(`should handle changing inputs`, async () => {
    const fixture = TestBed.createComponent(TinyStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const client = component.clientStore.data();

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);

    fixture.componentRef.setInput('clientId', 2);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const newClient = component.clientStore.data();

    expect(newClient).toBeTruthy();
    expect(newClient?.clientId).toBe(2);
  });
});
