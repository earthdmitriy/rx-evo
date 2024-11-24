import { TestBed } from '@angular/core/testing';
import { firstValueFrom, shareReplay, skip } from 'rxjs';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { StreamComponent } from './stream.component';

describe('StreamComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamComponent],
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

  it('should create the StreamComponent', () => {
    const fixture = TestBed.createComponent(StreamComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  // might fail with debounceTime(0) somewhere in streams
  it(`should populate displayData$`, async () => {
    const fixture = TestBed.createComponent(StreamComponent);
    const component = fixture.componentInstance;

    component.clientId = 1;

    const res = await firstValueFrom(component.client$);

    expect(res).toBeTruthy();
    expect(res.clientId).toBe(1);
  });

  it(`should handle changing inputs`, async () => {
    const fixture = TestBed.createComponent(StreamComponent);
    const component = fixture.componentInstance;
    const stream$ = component.client$.pipe(shareReplay());
    const skipFirst = stream$.pipe(skip(1));

    component.clientId = 1;

    await firstValueFrom(stream$);

    component.clientId = 2;

    const res = await firstValueFrom(skipFirst);

    expect(res).toBeTruthy();
    expect(res.clientId).toBe(2);
  });
});