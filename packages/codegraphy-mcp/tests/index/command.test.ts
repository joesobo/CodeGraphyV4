import { describe, expect, it, vi } from 'vitest';
import { runIndexCommand } from '../../src/index/command';

describe('index/command', () => {
  it('prints wait feedback before awaiting the Core Extension index response', async () => {
    let finishIndex: (() => void) | undefined;
    const writeStatus = vi.fn();
    const indexing = runIndexCommand({
      readRepoRegistry: () => ({
        activeRepo: '/workspace/project',
        repos: [],
      }),
      requestIndexRepo: async () => {
        await new Promise<void>(resolve => {
          finishIndex = resolve;
        });

        return {
          repo: '/workspace/project',
          graphCache: '.codegraphy/graph.lbug',
          message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
        };
      },
      writeStatus,
    });

    await Promise.resolve();

    expect(writeStatus).toHaveBeenCalledWith(
      'CodeGraphy indexing started for /workspace/project. Waiting for the Core Extension response...',
    );

    finishIndex?.();
    await expect(indexing).resolves.toMatchObject({ exitCode: 0 });
  });
});
