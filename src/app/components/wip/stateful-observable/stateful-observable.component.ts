import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { ClientBucketComponent } from '../../content/client-bucket/client-bucket.component';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import { StatefulBlockComponent } from '../../content/stateful-block/stateful-block.component';

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

}
