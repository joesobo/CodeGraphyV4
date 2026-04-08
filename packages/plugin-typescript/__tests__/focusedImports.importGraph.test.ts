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

  it('requires both a supported edge kind and at least one matching plugin source', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'src/external.ts', label: 'external.ts', color: '#fff' },
        { id: 'docs/Note.md', label: 'Note.md', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            { id: `${PLUGIN_ID}:es6-import`, pluginId: PLUGIN_ID, sourceId: 'es6-import', label: 'ES6 Imports' },
            { id: 'codegraphy.markdown:wikilink', pluginId: 'codegraphy.markdown', sourceId: 'wikilink', label: 'Wikilinks' },
          ],
        },
        {
          id: 'src/utils.ts->docs/Note.md#reference',
          from: 'src/utils.ts',
          to: 'docs/Note.md',
          kind: 'reference',
          sources: [
            { id: `${PLUGIN_ID}:es6-import`, pluginId: PLUGIN_ID, sourceId: 'es6-import', label: 'ES6 Imports' },
          ],
        },
        {
          id: 'src/external.ts->src/index.ts#import',
          from: 'src/external.ts',
          to: 'src/index.ts',
          kind: 'import',
          sources: [
            { id: 'codegraphy.markdown:wikilink', pluginId: 'codegraphy.markdown', sourceId: 'wikilink', label: 'Wikilinks' },
          ],
        },
      ],
    };

    const transformed = filterPluginImportGraph(graphData, PLUGIN_ID);

    expect(transformed.nodes.map(node => node.id)).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(transformed.edges.map(edge => edge.id)).toEqual(['src/index.ts->src/utils.ts#import']);
  });

  it('keeps import and reexport edges as separate supported kinds', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
        { id: 'src/reexport.ts', label: 'reexport.ts', color: '#fff' },
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
      ],
    };

    const transformed = filterPluginImportGraph(graphData, PLUGIN_ID);

    expect(transformed.edges).toHaveLength(2);
    expect(transformed.edges.map(edge => edge.kind)).toEqual(['import', 'reexport']);
  });
});
