import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { ProductsApiService } from '../../../services/api/ProductsApi.service';
import { combineResources } from '../../../services/resource/combineResources';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-resource',
  imports: [ClientInfoComponent, ClientBucketComponent, GenericErrorComponent],
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
    params: this.clientId,
    stream: (params) => this.clientsApi.getClient$(params.params),
  });

  private readonly productsResource = rxResource({
    stream: () => this.productsApi.allProducts$(),
  });

  private readonly bucketResource = rxResource({
    params: this.clientId,
    stream: (params) => this.bucketApi.getClientBucket$(params.params),
  });

  public readonly populatedBucketResource = combineResources(
    [this.bucketResource, this.productsResource],
    ([bucket, products]) =>
      bucket && products && prepareBucket(bucket, products),
  );
}
