import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../../app.config';
import { EventBusService } from '../../../services/EventBus.service';
import { ResourceComponent } from './resource.component';

describe('ResourceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceComponent],
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

  it('should create the ResourceComponent', () => {
    const fixture = TestBed.createComponent(ResourceComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it(`should populate client`, async () => {
    const fixture = TestBed.createComponent(ResourceComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    const client = component.clientResource.value();

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);
  });

  // fail
  /*it(`should populate client loading`, async () => {
    const fixture = TestBed.createComponent(ResourceComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);

    const client = component.clientResource.value();
    const loading = component.clientResource.isLoading();

    fixture.detectChanges();
    await fixture.whenStable();

    const newLoading = component.clientResource.isLoading();

    expect(loading).toBe(true);
    expect(newLoading).toBe(false);
  });*/

  // fail
  /*it(`loading materialize data`, async () => {
    const fixture = TestBed.createComponent(ResourceComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);

    const loading = component.clientResource.isLoading();

    fixture.detectChanges();
    await fixture.whenStable();

    const newLoading = component.clientResource.isLoading();
    const client = component.clientResource.value();

    expect(client).toBeTruthy();
    expect(loading).toBe(true);
    expect(newLoading).toBe(false);
  });*/

  it(`should handle changing inputs`, async () => {
    const fixture = TestBed.createComponent(ResourceComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const client = component.clientResource.value();

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);

    fixture.componentRef.setInput('clientId', 2);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const newClient = component.clientResource.value();

    expect(newClient).toBeTruthy();
    expect(newClient?.clientId).toBe(2);
  });
});
