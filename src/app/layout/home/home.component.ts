import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { routes } from '../../app.routes';
import { REPO_URL, VERDICTS, collectGroups, repoBlob } from '../../samples/sample-meta';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly groups = collectGroups(routes);
  protected readonly first = this.groups[0]?.samples[0];
  protected readonly verdicts = VERDICTS;
  protected readonly verdictList = Object.entries(VERDICTS).map(([key, v]) => ({ key, ...v }));
  protected readonly repoUrl = REPO_URL;
  protected readonly repoBlob = repoBlob;

  protected readonly pipeline = [
    { name: 'Event Source', text: 'clientId, filters, page, viewport range, expand row' },
    { name: 'Async Mapping', text: 'the HTTP call — the only impure boundary' },
    { name: 'Sync Mapping', text: 'pure functions: prepareBucket, combine, map' },
    { name: 'Consumer', text: 'template: value, pending, error' },
  ];
}
