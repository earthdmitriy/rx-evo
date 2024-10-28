import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { Bucket, BucketApiService } from '../../../services/BucketApi.service';
import { Client, ClientApiService } from '../../../services/ClientApi.service';
import {
  Product,
  ProductsApiService,
} from '../../../services/ProductsApi.service';
import { ClientWithBucket, prepareData } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
  ],
  templateUrl: './input.component.html',
  styleUrl: './input.component.less',
  //changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements OnInit, OnChanges, OnDestroy {
  @Input() public clientId!: number;
  @Input() public showBucket!: boolean;

  private readonly destroy$ = new Subject<void>();

  private products!: Product[];
  public ready = false;
  public displayData!: ClientWithBucket;

  public ngOnInit(): void {
    forkJoin([
      this.clientsApi.getClient$(this.clientId),
      this.bucketApi.getClientBucket$(this.clientId),
      this.productsApi.allProducts$(),
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([client, bucket, product]) => {
        this.products = product;
        this.displayData = prepareData(client, bucket, product);
        this.ready = true;
      });
  }

  public ngOnChanges(changes: SimpleChanges): void {
    const clientIdChange = changes['clientId'];
    if (clientIdChange && !clientIdChange.isFirstChange()) {
      this.ready = false;
      forkJoin([
        this.clientsApi.getClient$(this.clientId),
        this.bucketApi.getClientBucket$(this.clientId),
      ])
        .pipe(takeUntil(this.destroy$))
        .subscribe(([client, bucket]) => {
          this.displayData = prepareData(client, bucket, this.products);
          this.ready = true;
        });
    }
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  constructor(
    private readonly clientsApi: ClientApiService,
    private readonly bucketApi: BucketApiService,
    private readonly productsApi: ProductsApiService,
  ) {}
}
