import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-client-skeleton',
  imports: [CommonModule],
  templateUrl: './client-skeleton.component.html',
  styleUrl: './client-skeleton.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientSkeletonComponent {}
