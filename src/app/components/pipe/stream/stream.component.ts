import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import {
  BehaviorSubject,
  ReplaySubject,
  combineLatest,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { ProductsApiService } from '../../../services/api/ProductsApi.service';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';

@Component({
  selector: 'app-stream',
  imports: [CommonModule, ClientInfoComponent, ClientBucketComponent],
  templateUrl: './stream.component.html',
  styleUrl: './stream.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreamComponent {
  @Input() public set clientId(value: number) {
    this.clientId$.next(value);
  }
  private readonly clientId$ = new ReplaySubject<number>();
  @Input() public showBucket!: boolean;

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsApi = inject(ProductsApiService);

  public readonly clientLoading$ = new BehaviorSubject(true);
  public readonly bucketLoading$ = new BehaviorSubject(true);
  public readonly productsLoading$ = new BehaviorSubject(true);

  public readonly client$ = this.clientId$.pipe(
    tap(() => this.clientLoading$.next(true)),
    switchMap((clientId) => this.clientsApi.getClient$(clientId)),
    tap(() => this.clientLoading$.next(false)),
  );
  private readonly bucket$ = this.clientId$.pipe(
    tap(() => this.bucketLoading$.next(true)),
    switchMap((clientId) => this.bucketApi.getClientBucket$(clientId)),
    tap(() => this.bucketLoading$.next(false)),
  );
  private readonly products$ = this.productsApi
    .allProducts$()
    .pipe(tap(() => this.productsLoading$.next(false)));

  public readonly populatedBucket$ = combineLatest([
    this.bucket$,
    this.products$,
  ]).pipe(
    map(([bucket, products]) => prepareBucket(bucket, products)),
    shareReplay(1),
  );

  public readonly combinedLoading$ = combineLatest([
    this.bucketLoading$,
    this.productsLoading$,
  ]).pipe(map((arr) => arr.some(Boolean)));
}
