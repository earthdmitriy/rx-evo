import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import {
  combineTinyRxStores,
  createTinyRxStore,
} from '../../../services/tinyStore/tinyRxStore';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';
import { ProductsStoreService } from './products-store.service';
import { statefulObservable } from '../../../services/statefulObservable/statefulObservable';
import { map, shareReplay, switchMap } from 'rxjs';
import { combineStatefulObservables } from '../../../services/statefulObservable/statefulObservable-utils';

@Component({
  selector: 'app-stateful-observable',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
    GenericErrorComponent,
  ],
  templateUrl: './stateful-observable.component.html',
  styleUrls: ['./stateful-observable.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatefulObservableComponent {
  public readonly clientId = input.required<number>();
  public readonly showBucket = input<boolean>();

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsStore = inject(ProductsStoreService).store;

  public readonly clientStore = statefulObservable({
    input: toObservable(this.clientId),
  })
    .pipeValue(switchMap((clientId) => this.clientsApi.getClient$(clientId)))
    .pipeError(map(() => "Can't load client"));

  private readonly bucketStore = statefulObservable({
    input: toObservable(this.clientId),
  })
    .pipeValue(
      switchMap((clientId) => this.bucketApi.getClientBucket$(clientId)),
    )
    .pipe(shareReplay(1))
    .pipeError(map(() => "Can't load client"));

  public readonly populatedBucketStore = combineStatefulObservables(
    [this.bucketStore, this.productsStore],
    ([bucket, products]) => prepareBucket(bucket, products),
  );
}
