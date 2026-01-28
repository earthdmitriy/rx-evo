import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { BucketApiService } from '../../../services/api/BucketApi.service';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { prepareBucket } from '../../../services/utils';
import {
  combineStatefulObservables,
  statefulObservable,
} from '../../../submodules/stateful-observable/src';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { StatefulBlockComponent } from '../../content/stateful-block/stateful-block.component';
import { allProductsToken } from './products-store.service';

@Component({
  selector: 'app-stateful-observable',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    StatefulBlockComponent,
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

  private readonly clientId$ = toObservable(this.clientId);

  public readonly client$ = statefulObservable(() => this.clientId$)
    .pipeValue(switchMap((clientId) => this.clientsApi.getClient$(clientId)))
    .pipeError(map(() => "Can't load client" as const));

  private readonly allProducts$ = inject(allProductsToken);

  private readonly bucket$ = statefulObservable(this.clientId$)
    .pipeValue(
      switchMap((clientId) => this.bucketApi.getClientBucket$(clientId)),
    )
    .pipeError(map(() => "Can't load bucket"));

  public readonly populatedBucket$ = combineStatefulObservables(
    [this.bucket$, this.allProducts$],
    ([bucket, products]) => prepareBucket(bucket, products),
  );
}
