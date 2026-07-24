import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { readWorkspaceQuerySource } from '../../src/workspace/queryGraph';
import { requestWorkspaceGraphQueryBatch } from '../../src/workspace/requestQuery';

describe('workspace/requestQuery batch', () => {
  it('executes several projections from one Graph Cache snapshot', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-batch-'));
    await fs.writeFile(path.join(workspaceRoot, 'entry.ts'), "import './model';\n");
    await fs.writeFile(path.join(workspaceRoot, 'model.ts'), 'export const model = 1;\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const readQuerySource = vi.fn(readWorkspaceQuerySource);

    const result = await requestWorkspaceGraphQueryBatch({
      workspacePath: workspaceRoot,
      queries: [
        { report: 'nodes', arguments: { limit: 1 } },
        {
          report: 'edges',
          arguments: {
            from: 'entry.ts',
            expandFileSelectors: true,
            projectFileEndpoints: true,
            limit: 100,
          },
        },
      ],
    }, {
      cwd: () => workspaceRoot,
      readInstalledPluginCache: () => ({ version: 3, plugins: [] }),
      readQuerySource,
    });

    expect(readQuerySource).toHaveBeenCalledTimes(1);
    expect(result.results[0]).toMatchObject({
      nodes: [{ path: 'entry.ts', nodeType: 'file' }],
    });
    expect(result.results[1]).toMatchObject({
      edges: [{ from: 'entry.ts', to: 'model.ts', edgeTypes: ['import'] }],
    });
  });
});
