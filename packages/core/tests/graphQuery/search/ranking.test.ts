import { describe, expect, it } from 'vitest';
import { rankSearchDocuments } from '../../../src/graphQuery/search/ranking';

describe('core/graphQuery/search natural phrase ranking', () => {
  it('tokenizes camelCase identifiers and prioritizes all-term path matches', () => {
    const ranked = rankSearchDocuments('filter command', [
      {
        id: 'parse-test',
        path: 'tests/cli/parse.test.ts',
        text: "it('parses compact scope and filter commands', () => {});",
      },
      {
        id: 'filter-command',
        path: 'src/cli/filter/command.ts',
        text: 'export function runFilterCommand() {}',
      },
    ]);

    expect(ranked.map(result => result.id)).toEqual(['filter-command']);
  });

  it('returns no fallback ranking for a single exact-search term', () => {
    expect(rankSearchDocuments('runFilterCommand', [{
      id: 'filter-command',
      path: 'src/cli/filter/command.ts',
      text: 'export function runFilterCommand() {}',
    }])).toEqual([]);
  });

  it('ignores common natural-language stop words', () => {
    expect(rankSearchDocuments('the filter command', [
      { id: 'filter', path: 'src/filter/command.ts', text: '' },
      { id: 'other', path: 'src/other.ts', text: 'the command' },
    ])[0]?.id).toBe('filter');
  });
});
