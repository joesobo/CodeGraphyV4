import { describe, expect, it } from 'vitest';

import { runStatusCommand } from '../../../src/cli/status/command';

describe('status/command', () => {
  it('reports status for the current workspace by default', () => {
    const result = runStatusCommand(undefined, {
      cwd: () => '/workspace/project',
      readStatus: ({ workspacePath }) => ({
        workspaceRoot: workspacePath ?? '/workspace/project',
        graphCache: '/workspace/project/.codegraphy/graph.sqlite',
        state: 'missing',
        hasGraphCache: false,
        staleReasons: ['never-indexed'],
        enabledPlugins: ['codegraphy.markdown'],
        message: 'CodeGraphy Workspace Graph Cache is missing. Run `codegraphy index` to build it.',
      }),
    });

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot: '/workspace/project',
      state: 'missing',
      enabledPlugins: ['codegraphy.markdown'],
    });
  });

  it('passes verbose diagnostics to the workspace status request', () => {
    const diagnostics: string[] = [];

    runStatusCommand('/workspace/project', {
      cwd: () => '/workspace',
      readStatus: ({ diagnostics: sink }) => {
        sink?.emit({
          area: 'workspace',
          event: 'status-read',
          context: { workspaceRoot: '/workspace/project', state: 'missing' },
        });
        return {
          workspaceRoot: '/workspace/project',
          graphCache: '.codegraphy/graph.sqlite',
          state: 'missing',
          hasGraphCache: false,
          staleReasons: ['never-indexed'],
          enabledPlugins: ['codegraphy.markdown'],
          message: 'missing',
        };
      },
      writeDiagnostic: line => diagnostics.push(line),
    }, { verbose: true });

    expect(diagnostics).toEqual([
      '[CodeGraphy] Workspace status read: missing Graph Cache, workspace=/workspace/project',
    ]);
  });
});
