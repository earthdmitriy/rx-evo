import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineStatefulObservables, statefulObservable } from '@rx-evo/stateful-observable';
import { map, shareReplay, switchMap } from 'rxjs';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { prepareBucket } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';
import { ProductsStoreService } from './products-store.service';

@Component({
  selector: 'app-stateful-observable',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
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
