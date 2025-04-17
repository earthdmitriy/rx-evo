import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { BehaviorSubject, ReplaySubject, map } from 'rxjs';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { combineResponses, wrapMapRequest } from '../../../services/rx-utils';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-container-rx',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
    GenericErrorComponent,
  ],
  templateUrl: './container-rx.component.html',
  styleUrl: './container-rx.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerRxComponent {
  @Input() public set clientId(value: number) {
    this.clientId$.next(value);
  }
  private readonly clientId$ = new ReplaySubject<number>();
  @Input() public showBucket!: boolean;

  private readonly clientsApi = inject(ClientApiService);
  private readonly bucketApi = inject(BucketApiService);
  private readonly productsApi = inject(ProductsApiService);

  private readonly productsRequest = wrapMapRequest(
    new BehaviorSubject(true),
    () => this.productsApi.allProducts$(),
    (x) => x,
  );

  public readonly clientRequest = wrapMapRequest(
    this.clientId$,
    (clientId) => this.clientsApi.getClient$(clientId),
    (x) => x,
  );

  private readonly bucketRequest = wrapMapRequest(
    this.clientId$,
    (clientId) => this.bucketApi.getClientBucket$(clientId),
    (x) => x,
  );

  public readonly combined = combineResponses([
    this.bucketRequest,
    this.productsRequest,
  ]);

  public readonly combinedData$ = this.combined.data$.pipe(
    map(([bucket, product]) => prepareBucket(bucket, product)),
  );
}
