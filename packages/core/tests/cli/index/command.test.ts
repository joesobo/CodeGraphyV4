import { describe, expect, it, vi } from 'vitest';
import { runIndexCommand } from '../../../src/cli/index/command';

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
          graphCache: '.codegraphy/graph.sqlite',
          message: 'CodeGraphy indexing completed. CLI queries can now read the Graph Cache.',
          indexing: { mode: 'full', analyzedFiles: 2, deletedFiles: 0, reusedFiles: 0 },
        };
      },
      writeStatus,
    });

    await Promise.resolve();

    expect(writeStatus).toHaveBeenCalledWith(
      'Indexing /workspace/project...',
    );

    finishIndex?.();
    await expect(indexing).resolves.toMatchObject({ exitCode: 0 });
  });

  it('indexes an explicit workspace path when one is provided', async () => {
    const result = await runIndexCommand('/workspace/other', {
      cwd: () => '/workspace/project',
      indexWorkspace: async ({ workspacePath }) => ({
        workspaceRoot: workspacePath ?? '/workspace/project',
        graphCache: '.codegraphy/graph.sqlite',
        message: 'indexed',
        indexing: { mode: 'full', analyzedFiles: 0, deletedFiles: 0, reusedFiles: 0 },
      }),
      writeStatus: vi.fn(),
    });

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot: '/workspace/other',
    });
  });

  it('passes verbose diagnostics to the workspace indexing request', async () => {
    const diagnosticAreas: string[] = [];

    await runIndexCommand('/workspace/other', {
      cwd: () => '/workspace/project',
      indexWorkspace: async ({ diagnostics }) => {
        diagnostics?.emit({
          area: 'indexing',
          event: 'completed',
          context: { operationId: 'index-1', files: 2 },
        });
        return {
          workspaceRoot: '/workspace/other',
          graphCache: '.codegraphy/graph.sqlite',
          message: 'indexed',
          indexing: { mode: 'full', analyzedFiles: 2, deletedFiles: 0, reusedFiles: 0 },
        };
      },
      writeDiagnostic: line => diagnosticAreas.push(line),
      writeStatus: vi.fn(),
    }, { verbose: true });

    expect(diagnosticAreas).toEqual([
      '[CodeGraphy] Indexing complete: 2 files, operation=index-1',
    ]);
  });
});
