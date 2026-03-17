import { describe, expect, it } from 'vitest';
import {
  renderMarkdownGroupsSection,
  renderMarkdownGroupStyle,
  renderMarkdownUngroupedSection,
} from '../../../src/webview/export/markdownGroups';
import type { ExportConnectionsSection, ExportGroup } from '../../../src/webview/export/types';

const rules: ExportConnectionsSection['rules'] = {
  'ts:import': {
    name: 'Import',
    plugin: 'TypeScript',
    connections: 1,
  },
};

describe('exportMarkdownGroups', () => {
  describe('renderMarkdownGroupStyle', () => {
    it('joins color, shapes, and image metadata in export order', () => {
      const group: ExportGroup = {
        style: {
          color: '#3B82F6',
          shape2D: 'diamond',
          shape3D: 'cube',
          image: '.codegraphy/images/src.png',
        },
        files: {},
      };

      expect(renderMarkdownGroupStyle(group)).toBe(
        '#3B82F6 | diamond | cube | image: .codegraphy/images/src.png',
      );
    });
  });

  describe('renderMarkdownGroupsSection', () => {
    it('renders the none state when no grouped files exist', () => {
      expect(renderMarkdownGroupsSection({}, rules)).toEqual(['- none', '']);
    });

    it('renders grouped files with style metadata and nested file lines', () => {
      expect(renderMarkdownGroupsSection({
        'src/**': {
          style: {
            color: '#3B82F6',
            shape2D: 'diamond',
            image: '.codegraphy/images/src.png',
          },
          files: {
            'src/App.ts': {
              imports: {
                'ts:import': ['src/utils.ts'],
              },
            },
          },
        },
      }, rules)).toEqual([
        '#### `src/**`',
        '- style: #3B82F6 | diamond | image: .codegraphy/images/src.png',
        '- **src/App.ts**',
        '  - *Import*',
        '    - src/utils.ts',
        '',
      ]);
    });
  });

  describe('renderMarkdownUngroupedSection', () => {
    it('skips the section when there are no ungrouped files', () => {
      expect(renderMarkdownUngroupedSection({}, rules)).toEqual([]);
    });

    it('renders the ungrouped header and file lines', () => {
      expect(renderMarkdownUngroupedSection({
        'README.md': {},
      }, rules)).toEqual([
        '### Ungrouped',
        '',
        '- README.md',
        '',
      ]);
    });
  });
});
