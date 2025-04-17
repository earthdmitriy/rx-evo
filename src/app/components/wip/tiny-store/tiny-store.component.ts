import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import {
  combineTinyStores,
  createTinyStore,
} from '../../../services/tinyStore/tinyStore';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-tiny-store',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
    GenericErrorComponent,
  ],
  templateUrl: './tiny-store.component.html',
  styleUrls: ['./tiny-store.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TinyStoreComponent {
  public readonly clientId = input<number>();
  public readonly showBucket = input<boolean>();

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsApi = inject(ProductsApiService);

  public readonly clientStore = createTinyStore({
    input: this.clientId,
    loader: (clientId) => this.clientsApi.getClient$(clientId),
  });

  private readonly productsStore = createTinyStore({
    loader: () => this.productsApi.allProducts$(),
  });

  private readonly bucketStore = createTinyStore({
    input: this.clientId,
    loader: (clientId) => this.bucketApi.getClientBucket$(clientId),
  });

  public readonly populatedBucketStore = combineTinyStores(
    [this.bucketStore, this.productsStore],
    ([bucket, products]) => prepareBucket(bucket, products),
  );
}
