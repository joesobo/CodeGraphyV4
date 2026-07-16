import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { readGraphCacheStatus } from '../../src/graphCache/status';

describe('Graph Cache status', () => {
  it('reports a missing workspace-local Graph Cache', () => {
    const workspaceRoot = path.join('tmp', 'workspace');
    const status = readGraphCacheStatus(workspaceRoot, {
      exists: () => false,
    });

    expect(status).toEqual({
      workspaceRoot: path.resolve(workspaceRoot),
      graphCachePath: path.join(path.resolve(workspaceRoot), '.codegraphy', 'graph.sqlite'),
      state: 'missing',
    });
  });

  it('reports an available workspace-local Graph Cache', () => {
    expect(readGraphCacheStatus('/workspace', {
      exists: (filePath) => filePath === '/workspace/.codegraphy/graph.sqlite',
    }).state).toBe('available');
  });
});
