import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Client } from '../../../services/api/ClientApi.service';

@Component({
  selector: 'app-client-info',
  imports: [CommonModule],
  templateUrl: './client-info.component.html',
  styleUrl: './client-info.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientInfoComponent {
  public readonly displayData = input<Client | null>(null);
}
