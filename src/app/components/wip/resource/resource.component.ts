import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { combineResources } from '../../../services/resource/combineResources';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-resource',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
    GenericErrorComponent,
  ],
  templateUrl: './resource.component.html',
  styleUrls: ['./resource.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceComponent {
  public readonly clientId = input<number>();
  public readonly showBucket = input<boolean>();

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsApi = inject(ProductsApiService);

  public readonly clientResource = rxResource({
    request: this.clientId,
    loader: ({ request }) => this.clientsApi.getClient$(request),
  });

  private readonly productsResource = rxResource({
    loader: () => this.productsApi.allProducts$(),
  });

  private readonly bucketResource = rxResource({
    request: this.clientId,
    loader: ({ request }) => this.bucketApi.getClientBucket$(request),
  });

  public readonly populatedBucketResource = combineResources(
    [this.bucketResource, this.productsResource],
    ([bucket, products]) => prepareBucket(bucket, products),
  );
}
