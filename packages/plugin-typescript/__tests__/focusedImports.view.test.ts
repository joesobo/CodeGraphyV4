import { describe, expect, it } from 'vitest';
import type { IGraphData, IViewContext } from '@codegraphy-vscode/plugin-api';
import {
  createFocusedImportView,
  FOCUSED_IMPORT_VIEW_ID,
  FOCUSED_IMPORT_VIEW_NAME,
} from '../src/focusedImports/view';

const pluginId = 'codegraphy.typescript';

describe('focusedImports/view', () => {
  it('exposes the focused imports metadata', () => {
    const view = createFocusedImportView(pluginId);

    expect(view).toMatchObject({
      id: FOCUSED_IMPORT_VIEW_ID,
      name: FOCUSED_IMPORT_VIEW_NAME,
      icon: 'symbol-file',
      description: 'Shows the import neighborhood around the focused file',
      recomputeOn: ['focusedFile', 'depthLimit'],
    });
  });

  it('delegates graph transforms through the focused import filter', () => {
    const view = createFocusedImportView(pluginId);
    const graphData: IGraphData = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', color: '#fff' },
        { id: 'src/utils.ts', label: 'utils.ts', color: '#fff' },
      ],
      edges: [
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: `${pluginId}:es6-import`,
              pluginId,
              sourceId: 'es6-import',
              label: 'ES6 Imports',
            },
          ],
        },
      ],
    };
    const context: IViewContext = {
      activePlugins: new Set(),
      focusedFile: 'src/index.ts',
      depthLimit: 1,
    };

    const transformed = view.transform(graphData, context);

    expect(transformed.nodes.map(node => node.id)).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(transformed.edges).toEqual([
      expect.objectContaining({
        from: 'src/index.ts',
        to: 'src/utils.ts',
      }),
    ]);
  });
});
