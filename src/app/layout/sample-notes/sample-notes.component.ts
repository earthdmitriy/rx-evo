import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  resource,
} from '@angular/core';
import { MarkdownSection, SectionKind, splitSections } from '../markdown';
import { MarkdownViewComponent } from '../markdown-view/markdown-view.component';
import { SampleMeta } from '../../samples/sample-meta';

const SECTION_STYLE: Record<
  SectionKind,
  { card: string; icon: string; iconClass: string }
> = {
  warning: {
    card: 'border-rose-300 bg-rose-100/70 ring-1 ring-rose-200',
    icon: '⚠',
    iconClass: 'text-rose-700',
  },
  idea: { card: 'border-slate-200 bg-white', icon: '◆', iconClass: 'text-indigo-500' },
  good: { card: 'border-emerald-200 bg-emerald-50/50', icon: '✓', iconClass: 'text-emerald-600' },
  bad: { card: 'border-rose-200 bg-rose-50/50', icon: '✕', iconClass: 'text-rose-600' },
  try: { card: 'border-sky-200 bg-sky-50/50', icon: '▶', iconClass: 'text-sky-600' },
  next: { card: 'border-indigo-200 bg-indigo-50/50', icon: '→', iconClass: 'text-indigo-600' },
  other: { card: 'border-slate-200 bg-white', icon: '•', iconClass: 'text-slate-400' },
};

/** Notes panel: the sample README rendered as Idea / Good / Bad / Try it / Next step cards. */
@Component({
  selector: 'app-sample-notes',
  imports: [MarkdownViewComponent],
  templateUrl: './sample-notes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleNotesComponent {
  public readonly sample = input.required<SampleMeta>();

  protected readonly readme = resource({
    params: () => this.sample(),
    loader: ({ params }) => params.readme(),
  });

  protected readonly sections = computed<
    (MarkdownSection & (typeof SECTION_STYLE)[SectionKind])[]
  >(() =>
    splitSections(this.readme.value() ?? '').map((s) => ({
      ...s,
      ...SECTION_STYLE[s.kind],
    })),
  );
}
