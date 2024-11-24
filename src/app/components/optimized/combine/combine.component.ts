import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { BucketApiService } from '../../../services/BucketApi.service';
import { ClientApiService } from '../../../services/ClientApi.service';
import { ProductsApiService } from '../../../services/ProductsApi.service';
import { ClientWithBucket, prepareData } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';

@Component({
  selector: 'app-combine',
  imports: [
    CommonModule,
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
  ],
  templateUrl: './combine.component.html',
  styleUrl: './combine.component.less',
})
export class CombineComponent implements OnInit, OnDestroy {
  @Input() public clientId!: number;
  @Input() public showBucket!: boolean;

  private readonly destroy$ = new Subject<void>();

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
        this.displayData = prepareData(client, bucket, product);
        this.ready = true;
      });
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
