import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, shareReplay, skip } from 'rxjs';
import { SKIPDELAY_TOKEN } from '../../../app.config';
import { EventBusService } from '../../../services/EventBus.service';
import { StreamComponent } from './stream.component';

describe('StreamComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamComponent],
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
