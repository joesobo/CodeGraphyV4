import { describe, expect, it } from 'vitest';
import type { IGraphData } from '@codegraphy-vscode/plugin-api';
import { filterPluginImportGraph } from '../src/focusedImports/importGraph';

const PLUGIN_ID = 'codegraphy.typescript';

describe('focusedImports/importGraph', () => {
  it('keeps only import and reexport edges from the plugin', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'src/reexport.ts', label: 'reexport.ts', color: '#fff' },
        { id: 'docs/Note.md', label: 'Note.md', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [{ id: `${PLUGIN_ID}:es6-import`, pluginId: PLUGIN_ID, sourceId: 'es6-import', label: 'ES6 Imports' }],
        },
        {
          id: 'src/utils.ts->src/reexport.ts#reexport',
          from: 'src/utils.ts',
          to: 'src/reexport.ts',
          kind: 'reexport',
          sources: [{ id: `${PLUGIN_ID}:reexport`, pluginId: PLUGIN_ID, sourceId: 'reexport', label: 'Re-exports' }],
        },
        {
          id: 'docs/Note.md->src/index.ts#reference',
          from: 'docs/Note.md',
          to: 'src/index.ts',
          kind: 'reference',
          sources: [{ id: 'codegraphy.markdown:wikilink', pluginId: 'codegraphy.markdown', sourceId: 'wikilink', label: 'Wikilinks' }],
        },
      ],
    };

    expect(filterPluginImportGraph(graphData, PLUGIN_ID)).toEqual({
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'src/reexport.ts', label: 'reexport.ts', color: '#fff' },
      ],
      edges: [
        expect.objectContaining({ kind: 'import', from: 'src/index.ts', to: 'src/utils.ts' }),
        expect.objectContaining({ kind: 'reexport', from: 'src/utils.ts', to: 'src/reexport.ts' }),
      ],
    });
  });
});
