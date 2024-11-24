import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { TinyRxStoreComponent } from './tiny-rx-store.component';

describe('TinyRxStoreComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TinyRxStoreComponent],
      providers: [
        {
          provide: ClientApiService,
          useFactory: () => new ClientApiService(true),
        },
        {
          provide: BucketApiService,
          useFactory: () => new BucketApiService(true),
        },
        {
          provide: ProductsApiService,
          useFactory: () => new ProductsApiService(true),
        },
      ],
    }).compileComponents();
  });

  it('should create the TinyRxStoreComponent', () => {
    const fixture = TestBed.createComponent(TinyRxStoreComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it(`should populate client`, async () => {
    const fixture = TestBed.createComponent(TinyRxStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    const client = await firstValueFrom(component.clientStore.data);

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);
  });

  it(`should populate client loading`, async () => {
    const fixture = TestBed.createComponent(TinyRxStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);

    fixture.detectChanges();
    await fixture.whenStable();

    const loading = await firstValueFrom(component.clientStore.loading);

    expect(loading).toBe(false);
  });

  it(`loading materialize data`, async () => {
    const fixture = TestBed.createComponent(TinyRxStoreComponent);
    const component = fixture.componentInstance;

    const loadingEvents: boolean[] = [];

    component.clientStore.loading.subscribe((x) => loadingEvents.push(x));

    fixture.componentRef.setInput('clientId', 1);

    fixture.detectChanges();
    await fixture.whenStable();

    const loading = await firstValueFrom(component.clientStore.loading);
    const client = await firstValueFrom(component.clientStore.data);

    expect(client).toBeTruthy();
    expect(loading).toBe(false);
    expect(loadingEvents).toEqual([true, false]);
  });

  it(`should handle changing inputs`, async () => {
    const fixture = TestBed.createComponent(TinyRxStoreComponent);
    const component = fixture.componentInstance;

    fixture.componentRef.setInput('clientId', 1);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const client = await firstValueFrom(component.clientStore.data);

    expect(client).toBeTruthy();
    expect(client?.clientId).toBe(1);

    fixture.componentRef.setInput('clientId', 2);
    fixture.detectChanges();
    await fixture.whenStable(); // required in case of some dalays in async code

    const newClient = await firstValueFrom(component.clientStore.data);

    expect(newClient).toBeTruthy();
    expect(newClient?.clientId).toBe(2);
  });
});
