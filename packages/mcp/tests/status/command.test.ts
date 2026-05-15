import { describe, expect, it } from 'vitest';

import { runStatusCommand } from '../../src/status/command';

describe('status/command', () => {
  it('reports status for the current workspace by default', () => {
    const result = runStatusCommand(undefined, {
      cwd: () => '/workspace/project',
      readStatus: ({ workspacePath }) => ({
        workspaceRoot: workspacePath ?? '/workspace/project',
        graphCache: '/workspace/project/.codegraphy/graph.lbug',
        state: 'missing',
        hasGraphCache: false,
        staleReasons: ['never-indexed'],
        enabledPlugins: ['@codegraphy/plugin-markdown'],
        message: 'CodeGraphy Workspace Graph Cache is missing. Run `codegraphy index` to build it.',
      }),
    });

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot: '/workspace/project',
      state: 'missing',
      enabledPlugins: ['@codegraphy/plugin-markdown'],
    });
  });
});
