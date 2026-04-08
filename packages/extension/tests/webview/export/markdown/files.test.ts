import { describe, expect, it } from 'vitest';
import {
  renderMarkdownFiles,
  resolveMarkdownRuleLabel,
} from '../../../../src/webview/export/markdown/files';
import { UNATTRIBUTED_RULE_KEY, type ExportConnectionsSection } from '../../../../src/webview/export/shared/contracts';

const sources: ExportConnectionsSection['sources'] = {
  'ts:import': {
    name: 'Import',
    plugin: 'TypeScript',
    connections: 1,
  },
};

describe('exportMarkdownFiles', () => {
  describe('resolveMarkdownRuleLabel', () => {
    it('returns unattributed for the reserved rule key and falls back to the raw key when unknown', () => {
      expect(resolveMarkdownRuleLabel(UNATTRIBUTED_RULE_KEY, sources)).toBe('unattributed');
      expect(resolveMarkdownRuleLabel('unknown', sources)).toBe('unknown');
    });
  });

  describe('renderMarkdownFiles', () => {
    it('renders plain file entries when a file has no imports', () => {
      expect(renderMarkdownFiles({ 'README.md': {} }, sources)).toEqual(['- README.md']);
    });

    it('renders unattributed-only imports without a nested rule heading', () => {
      expect(renderMarkdownFiles({
        'README.md': {
          imports: {
            [UNATTRIBUTED_RULE_KEY]: ['src/App.ts'],
          },
        },
      }, sources)).toEqual([
        '- **README.md**',
        '  - src/App.ts',
      ]);
    });

    it('renders labeled imports and skips empty target lists', () => {
      expect(renderMarkdownFiles({
        'src/App.ts': {
          imports: {
            'ts:import': ['src/utils.ts'],
            unknown: [],
            [UNATTRIBUTED_RULE_KEY]: ['README.md'],
          },
        },
      }, sources)).toEqual([
        '- **src/App.ts**',
        '  - *Import*',
        '    - src/utils.ts',
        '  - *unattributed*',
        '    - README.md',
      ]);
    });
  });
});
