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
  // data URL fallback used when the avatar fails to load (network error, 404)
  public readonly avatarPlaceholder =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="Arial, Helvetica, sans-serif" font-size="16">No Avatar</text></svg>',
    );

  public onImgError(event: Event) {
    const img = event.target as HTMLImageElement | null;
    if (!img) return;
    // don't loop if the placeholder can't be loaded for some reason
    if (img.src === this.avatarPlaceholder) return;
    img.src = this.avatarPlaceholder;
  }
}
