import { TestBed } from '@angular/core/testing';
import { firstValueFrom, shareReplay, skip } from 'rxjs';
import { ClientApiService } from '../../../services/ClientApi.service';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { TinyStoreComponent } from './tiny-store.component';

describe('TinyStoreComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TinyStoreComponent],
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
