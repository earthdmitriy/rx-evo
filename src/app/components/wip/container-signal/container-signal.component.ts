
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, filter } from 'rxjs';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { ProductsApiService } from '../../../services/api/ProductsApi.service';
import { combineResponses, wrapMapRequest } from '../../../services/rx-utils';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-container-signal',
  imports: [
    ClientInfoComponent,
    ClientBucketComponent,
    GenericErrorComponent
],
  templateUrl: './container-signal.component.html',
  styleUrl: './container-signal.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerSignalComponent {
  public readonly clientId = input<number>();
  public readonly showBucket = input<boolean>();
  private readonly clientId$ = toObservable(this.clientId).pipe(
    filter(Boolean),
  );

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
  ).toSignal();

  private readonly bucketRequest = wrapMapRequest(
    this.clientId$,
    (clientId) => this.bucketApi.getClientBucket$(clientId),
    (x) => x,
  );

  public readonly combined = combineResponses([
    this.bucketRequest,
    this.productsRequest,
  ]).toSignal();

  public readonly combinedData = computed(() => {
    const data = this.combined.data();
    if (!data) return null;

    const [bucket, product] = data;
    return prepareBucket(bucket, product);
  });
}
