import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';

import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, combineLatest, filter, map, switchMap, tap } from 'rxjs';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { ProductsApiService } from '../../../services/api/ProductsApi.service';
import { PopulatedBucket, prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';

@Component({
  selector: 'app-signal',
  imports: [
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
  ],
  templateUrl: './signal.component.html',
  styleUrl: './signal.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalComponent {
  public readonly clientId = input.required<number>();
  private readonly clientId$ = toObservable(this.clientId);

  public readonly showBucket = input<boolean>();

  public readonly clientReady = signal(false);
  public readonly bucketReady = signal(false);

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsApi = inject(ProductsApiService);

  private readonly client$ = this.clientId$.pipe(
    tap(() => this.clientReady.set(false)),
    switchMap((clientId) => this.clientsApi.getClient$(clientId)),
    tap(() => this.clientReady.set(true)),
  );
  private readonly bucket$ = this.clientId$.pipe(
    tap(() => this.bucketReady.set(false)),
    switchMap((clientId) => this.bucketApi.getClientBucket$(clientId)),
    tap(() => this.bucketReady.set(true)),
  );
  private readonly products$ = this.productsApi.allProducts$();

  private readonly populatedBucket$: Observable<PopulatedBucket> =
    combineLatest([this.bucket$, this.products$]).pipe(
      map(([bucket, product]) => prepareBucket(bucket, product)),
    );

  public readonly client = toSignal(this.client$);
  public readonly populatedBucket = toSignal(this.populatedBucket$);
}
