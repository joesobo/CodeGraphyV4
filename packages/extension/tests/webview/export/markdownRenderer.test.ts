import { describe, expect, it } from 'vitest';
import { renderMarkdownExport } from '../../../src/webview/export/markdownRenderer';
import type { ExportData } from '../../../src/webview/export/types';

function createExportData(overrides: Partial<ExportData> = {}): ExportData {
  return {
    format: 'codegraphy-export',
    version: '2.0',
    exportedAt: '2026-03-16T12:34:56.000Z',
    scope: {
      graph: 'current-view',
      timeline: {
        active: false,
        commitSha: null,
      },
    },
    summary: {
      totalFiles: 0,
      totalConnections: 0,
      totalRules: 0,
      totalGroups: 0,
      totalImages: 0,
    },
    sections: {
      connections: {
        rules: {},
        groups: {},
        ungrouped: {},
      },
      images: {},
    },
    ...overrides,
  };
}

describe('renderMarkdownExport', () => {
  it('renders empty-state sections for inactive timeline exports', () => {
    const markdown = renderMarkdownExport(createExportData());

    expect(markdown).toBe([
      '# CodeGraphy Export',
      '',
      '> 0 files, 0 connections',
      '> timeline: inactive',
      '',
      '## Connections',
      '',
      '### Groups',
      '',
      '- none',
      '',
      '## Images',
      '',
      '- none',
      '',
    ].join('\n'));
  });

  it('renders rules, grouped files, unattributed targets, and image ownership', () => {
    const markdown = renderMarkdownExport(createExportData({
      scope: {
        graph: 'current-view',
        timeline: {
          active: true,
          commitSha: 'abc123',
        },
      },
      summary: {
        totalFiles: 2,
        totalConnections: 2,
        totalRules: 1,
        totalGroups: 1,
        totalImages: 1,
      },
      sections: {
        connections: {
          rules: {
            'ts:import': {
              name: 'Import',
              plugin: 'TypeScript',
              connections: 1,
            },
          },
          groups: {
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
                    unattributed: ['README.md'],
                  },
                },
              },
            },
          },
          ungrouped: {
            'README.md': {},
          },
        },
        images: {
          '.codegraphy/images/src.png': {
            groups: ['src/**'],
          },
        },
      },
    }));

    expect(markdown).toBe([
      '# CodeGraphy Export',
      '',
      '> 2 files, 2 connections',
      '> timeline commit: abc123',
      '',
      '## Connections',
      '',
      '### Rules',
      '',
      '- **Import** (`ts:import`, TypeScript) - 1 connections',
      '',
      '### Groups',
      '',
      '#### `src/**`',
      '- style: #3B82F6 | diamond | image: .codegraphy/images/src.png',
      '- **src/App.ts**',
      '  - *Import*',
      '    - src/utils.ts',
      '  - *unattributed*',
      '    - README.md',
      '',
      '### Ungrouped',
      '',
      '- README.md',
      '',
      '## Images',
      '',
      '- `.codegraphy/images/src.png` (groups: `src/**`)',
      '',
    ].join('\n'));
  });
});
