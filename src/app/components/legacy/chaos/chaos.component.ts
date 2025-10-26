
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
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
  selector: 'app-chaos',
  imports: [
    ClientInfoComponent,
    ClientBucketComponent,
    ClientSkeletonComponent
],
  templateUrl: './chaos.component.html',
  styleUrl: './chaos.component.less',
})
export class ChaosComponent implements OnInit, OnChanges {
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
    this.fetchProducts();
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'].currentValue) {
      this.fetchClient();
      this.fetchBucket();
    }
  }

  private fetchClient() {
    this.clientsApi
      .getClientProm(this.clientId)
      .then((client) => (this.client = client));
  }

  private fetchBucket() {
    this.bucketApi
      .getClientBucketProm(this.clientId)
      .then((bucket) => (this.bucket = bucket));
  }

  private fetchProducts() {
    this.productsApi.allProductsProm().then((products) => {
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
