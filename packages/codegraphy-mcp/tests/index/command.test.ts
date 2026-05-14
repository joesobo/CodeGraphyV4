import { describe, expect, it, vi } from 'vitest';
import { runIndexCommand } from '../../src/index/command';

describe('index/command', () => {
  it('indexes the current workspace by default and prints wait feedback', async () => {
    let finishIndex: (() => void) | undefined;
    const writeStatus = vi.fn();
    const indexing = runIndexCommand(undefined, {
      cwd: () => '/workspace/project',
      indexWorkspace: async ({ workspacePath }) => {
        expect(workspacePath).toBe('/workspace/project');
        await new Promise<void>(resolve => {
          finishIndex = resolve;
        });

        return {
          workspaceRoot: '/workspace/project',
          graphCache: '.codegraphy/graph.lbug',
          message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
        };
      },
      writeStatus,
    });

    await Promise.resolve();

    expect(writeStatus).toHaveBeenCalledWith(
      'CodeGraphy indexing started for /workspace/project...',
    );

    finishIndex?.();
    await expect(indexing).resolves.toMatchObject({ exitCode: 0 });
  });

  it('indexes an explicit workspace path when one is provided', async () => {
    const result = await runIndexCommand('/workspace/other', {
      cwd: () => '/workspace/project',
      indexWorkspace: async ({ workspacePath }) => ({
        workspaceRoot: workspacePath ?? '/workspace/project',
        graphCache: '.codegraphy/graph.lbug',
        message: 'indexed',
      }),
      writeStatus: vi.fn(),
    });

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot: '/workspace/other',
    });
  });
});
