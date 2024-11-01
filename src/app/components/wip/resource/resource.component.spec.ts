import { TestBed } from '@angular/core/testing';
import { firstValueFrom, shareReplay, skip } from 'rxjs';
import { ClientApiService } from '../../../services/ClientApi.service';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { ResourceComponent } from './resource.component';

describe('ResourceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceComponent],
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
  it(`should populate client loading`, async () => {
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
  });

  // fail
  it(`loading materialize data`, async () => {
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
  });

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
