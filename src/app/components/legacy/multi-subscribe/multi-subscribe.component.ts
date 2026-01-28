import { Component, Input, OnInit } from '@angular/core';
import {
  Bucket,
  BucketApiService,
} from '../../../services/api/BucketApi.service';
import {
  Client,
  ClientApiService,
} from '../../../services/api/ClientApi.service';
import {
  Product,
  ProductsApiService,
} from '../../../services/api/ProductsApi.service';
import { ClientWithBucket, prepareData } from '../../../services/utils';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { ClientSkeletonComponent } from '../../content/client-skeleton/client-skeleton.component';

@Component({
  selector: 'app-multi-subscribe',
  imports: [
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent,
  ],
  templateUrl: './multi-subscribe.component.html',
  styleUrl: './multi-subscribe.component.less',
})
export class MultiSubscribeComponent implements OnInit {
  @Input() public clientId!: number;
  @Input() public showBucket!: boolean;

  private client!: Client;
  private bucket!: Bucket;
  private products!: Product[];
  public ready = false;
  public displayData!: ClientWithBucket;

  public ngOnInit(): void {
    this.fetchClient();
    this.fetchBucket();
  }

  private fetchClient() {
    this.clientsApi
      .getClient$(this.clientId)
      .subscribe((client) => (this.client = client));
  }

  private fetchBucket() {
    this.bucketApi.getClientBucket$(this.clientId).subscribe((bucket) => {
      this.bucket = bucket;
      this.fetchProducts();
    });
  }

  private fetchProducts() {
    this.productsApi.allProducts$().subscribe((products) => {
      this.products = products;
      this.displayData = prepareData(this.client, this.bucket, this.products);
      this.ready = true;
    });
  }

  constructor(
    private readonly clientsApi: ClientApiService,
    private readonly bucketApi: BucketApiService,
    private readonly productsApi: ProductsApiService,
  ) {}
}
