import { describe, expect, it } from 'vitest';
import type { IProjectedConnection } from '../../../../src/analysis/projectedConnection';
import { DEFAULT_NODE_COLOR } from '../../../../src/fileColors';
import { buildWorkspaceGraphData } from '../../../../src/graph/data';
import { createPlugin } from '../fixture';

describe('core/graph/data external package relationships', () => {
    it('materializes external package nodes for unresolved TypeScript imports', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {
          'src/index.ts': { size: 10 },
        },
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/index.ts', [
            { specifier: 'node:fs/promises', resolvedPath: null, kind: 'import', pluginId: 'codegraphy.typescript', sourceId: 'es6-import' },
          ]],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('codegraphy.typescript'),
      });

      expect(graph.nodes).toEqual([
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: DEFAULT_NODE_COLOR,
          fileSize: 10,
        },
        {
          id: 'pkg:fs',
          label: 'fs',
          color: '#F59E0B',
          nodeType: 'package',
          shape2D: 'hexagon',
        },
      ]);
      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->pkg:fs#import',
          from: 'src/index.ts',
          to: 'pkg:fs',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.typescript:es6-import',
              pluginId: 'codegraphy.typescript',
              sourceId: 'es6-import',
              label: 'ES6 import',
            },
          ],
        },
      ]);
    });

});
