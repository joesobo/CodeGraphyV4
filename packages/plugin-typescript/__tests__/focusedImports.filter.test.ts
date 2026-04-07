import { describe, expect, it } from 'vitest';
import type { IGraphData, IViewContext } from '@codegraphy-vscode/plugin-api';
import { filterFocusedImportGraph } from '../src/focusedImports/filter';

const PLUGIN_ID = 'codegraphy.typescript';

function createContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

describe('focusedImports/filter', () => {
  it('returns the plugin import graph when there is no focused file', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'docs/Note.md', label: 'Note.md', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: `${PLUGIN_ID}:es6-import`,
              pluginId: PLUGIN_ID,
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
        {
          id: 'docs/Note.md->src/index.ts#reference',
          from: 'docs/Note.md',
          to: 'src/index.ts',
          kind: 'reference',
          sources: [
            {
              id: 'codegraphy.markdown:wikilink',
              pluginId: 'codegraphy.markdown',
              sourceId: 'wikilink',
              label: 'Wikilinks',
            },
          ],
        },
      ],
    };

    const transformed = filterFocusedImportGraph(graphData, createContext(), PLUGIN_ID);

    expect(transformed).toEqual({
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
      ],
      edges: [
        expect.objectContaining({
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
        }),
      ],
    });
  });

  it('uses a minimum depth limit of one hop', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'src/deep.ts', label: 'deep.ts', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: `${PLUGIN_ID}:es6-import`,
              pluginId: PLUGIN_ID,
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
        {
          id: 'src/utils.ts->src/deep.ts#import',
          from: 'src/utils.ts',
          to: 'src/deep.ts',
          kind: 'import',
          sources: [
            {
              id: `${PLUGIN_ID}:reexport`,
              pluginId: PLUGIN_ID,
              sourceId: 'reexport',
              label: 'Re-exports',
            },
          ],
        },
      ],
    };

    const transformed = filterFocusedImportGraph(graphData, createContext({
      focusedFile: 'src/index.ts',
      depthLimit: 0,
    }), PLUGIN_ID);

    expect(transformed.nodes.map(node => node.id)).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(transformed.nodes.find(node => node.id === 'src/index.ts')?.depthLevel).toBe(0);
    expect(transformed.nodes.find(node => node.id === 'src/utils.ts')?.depthLevel).toBe(1);
    expect(transformed.nodes.some(node => node.id === 'src/deep.ts')).toBe(false);
  });
});
