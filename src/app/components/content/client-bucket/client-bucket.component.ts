import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PopulatedBucket } from '../../../services/utils';

@Component({
  selector: 'app-client-bucket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-bucket.component.html',
  styleUrl: './client-bucket.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientBucketComponent {
  public readonly bucket = input<PopulatedBucket>();
}
