import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import {
  combineTinyRxStores,
  createTinyRxStore,
} from '../../../services/tinyStore/tinyRxStore';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';
import { ProductsStoreService } from './products-store.service';

@Component({
  selector: 'app-tiny-rx-store',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
  ],
  templateUrl: './tiny-rx-store.component.html',
  styleUrls: ['./tiny-rx-store.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TinyRxStoreComponent {
  public readonly clientId = input<number>();
  public readonly showBucket = input<boolean>();

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsStore = inject(ProductsStoreService).store;

  public readonly clientStore = createTinyRxStore({
    input: toObservable(this.clientId),
    loader: (clientId) => this.clientsApi.getClient$(clientId),
  });

  private readonly bucketStore = createTinyRxStore({
    input: toObservable(this.clientId),
    loader: (clientId) => this.bucketApi.getClientBucket$(clientId),
  });

  public readonly populatedBucketStore = combineTinyRxStores(
    [this.bucketStore, this.productsStore],
    ([bucket, products]) => prepareBucket(bucket, products),
  );
}
