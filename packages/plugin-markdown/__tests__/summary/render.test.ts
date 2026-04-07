import { describe, expect, it } from 'vitest';
import type { RankedNode } from '../../src/summary/types';
import { renderSummaryMarkdown } from '../../src/summary/render';

describe('renderSummaryMarkdown', () => {
  it('renders counts and note sections', () => {
    const linked: RankedNode[] = [
      {
        node: { id: 'Home.md', label: 'Home.md', color: '#fff' },
        linkCount: 2,
        neighborCount: 1,
      },
    ];
    const orphaned: RankedNode[] = [
      {
        node: { id: 'Orphan.md', label: 'Orphan.md', color: '#fff' },
        linkCount: 0,
        neighborCount: 0,
      },
    ];

    const markdown = renderSummaryMarkdown(2, 1, linked, orphaned);

    expect(markdown).toBe([
      '# Markdown Wikilink Summary',
      '',
      '- Notes: 2',
      '- Wikilinks: 1',
      '- Orphan notes: 1',
      '',
      '## Most linked notes',
      '- `Home.md` (2 wikilinks, 1 neighbors)',
      '',
      '## Orphan notes',
      '- `Orphan.md`',
      '',
    ].join('\n'));
  });

  it('renders empty sections as none', () => {
    const markdown = renderSummaryMarkdown(1, 0, [], []);

    expect(markdown).toBe([
      '# Markdown Wikilink Summary',
      '',
      '- Notes: 1',
      '- Wikilinks: 0',
      '- Orphan notes: 0',
      '',
      '## Most linked notes',
      '- None',
      '',
      '## Orphan notes',
      '- None',
      '',
    ].join('\n'));
  });
});
