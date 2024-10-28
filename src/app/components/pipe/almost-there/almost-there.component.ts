import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { Bucket, BucketApiService } from '../../../services/BucketApi.service';
import { Client, ClientApiService } from '../../../services/ClientApi.service';
import {
  Product,
  ProductsApiService,
} from '../../../services/ProductsApi.service';
import { ClientWithBucket, prepareData } from '../../../services/utils';
import { Observable, combineLatest, defer, map, tap } from 'rxjs';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';

@Component({
  selector: 'app-almost-there',
  standalone: true,
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
  ],
  templateUrl: './almost-there.component.html',
  styleUrl: './almost-there.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlmostThereComponent {
  @Input() public clientId!: number;
  @Input() public showBucket!: boolean;

  public ready = false;

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsApi = inject(ProductsApiService);

  // observable being constucted when templete subsribes
  // with defer we can describe observable in place instead of in onInit
  private readonly client$ = defer(() =>
    this.clientsApi.getClient$(this.clientId),
  );
  private readonly bucket$ = defer(() =>
    this.bucketApi.getClientBucket$(this.clientId),
  );
  private readonly products$ = this.productsApi.allProducts$();

  public readonly displayData$: Observable<ClientWithBucket> = combineLatest([
    this.client$,
    this.bucket$,
    this.products$,
  ]).pipe(
    map(([client, bucket, product]) => prepareData(client, bucket, product)),
    tap(() => (this.ready = true)),
  );
}
