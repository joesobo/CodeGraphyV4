import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import { readCodeGraphyWorkspaceStatusForCli } from '../../src/workspace/requestStatus';

describe('core-backed CodeGraphy Workspace commands', () => {
  it('indexes, reports fresh status, and queries a workspace without VS Code', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-mcp-workspace-'));
    await fs.writeFile(path.join(workspaceRoot, 'Home.md'), 'See [[Target.md]].\n', 'utf-8');
    await fs.writeFile(path.join(workspaceRoot, 'Target.md'), 'Done.\n', 'utf-8');

    const indexResult = await requestCodeGraphyIndexWorkspace({
      workspacePath: workspaceRoot,
    });
    const status = readCodeGraphyWorkspaceStatusForCli({
      workspacePath: workspaceRoot,
    });
    const queryResult = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: { from: 'Home.md' },
    });

    expect(indexResult).toMatchObject({
      workspaceRoot,
      graphCache: '.codegraphy/graph.lbug',
    });
    expect(status).toMatchObject({
      workspaceRoot,
      state: 'fresh',
      enabledPlugins: ['@codegraphy-dev/plugin-markdown'],
    });
    expect(queryResult.edges).toEqual([
      expect.objectContaining({
        from: 'Home.md',
        to: 'Target.md',
      }),
    ]);
  });
});
