import { TestBed } from '@angular/core/testing';
import { firstValueFrom, shareReplay, skip } from 'rxjs';
import { ClientApiService } from '../../../services/ClientApi.service';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { SignalComponent } from './signal.component';

describe('SignalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignalComponent],
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
