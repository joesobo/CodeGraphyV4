import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import {
  runFileMutationScenario,
  type FileMutationScenarioDependencies,
  type RunFileMutationScenarioInput,
} from '../../../../../src/extension/perf/scenarios/fileMutation/run';
import type { WorkspaceFileMutation } from '../../../../../src/extension/graphView/provider/file/mutations';

const originalContents = new TextEncoder().encode('export const original = true;\n');
const workspaceFolderUri = { fsPath: '/fixture', path: '/fixture' } as vscode.Uri;

function copy(contents: Uint8Array): Uint8Array {
  return new Uint8Array(contents);
}

function setup(scenario: 'rename' | 'create' | 'delete') {
  const files = new Map<string, Uint8Array>();
  const sourcePath = scenario === 'rename'
    ? 'src/group-00000/file-000004.ts'
    : 'src/group-00000/file-000003.ts';
  if (scenario !== 'create') files.set(sourcePath, copy(originalContents));

  let lastMutation: WorkspaceFileMutation | undefined;
  const executeMutation = vi.fn(async (mutation: WorkspaceFileMutation) => {
    lastMutation = mutation;
    switch (mutation.kind) {
      case 'rename': {
        const contents = files.get(mutation.oldPath);
        if (!contents) throw new Error('rename source missing');
        files.delete(mutation.oldPath);
        files.set(mutation.newPath, contents);
        break;
      }
      case 'create':
        files.set(mutation.filePath, new Uint8Array());
        break;
      case 'delete':
        for (const path of mutation.paths) files.delete(path);
        break;
    }
  });
  const undoLastMutation = vi.fn(async () => {
    if (!lastMutation) return undefined;
    switch (lastMutation.kind) {
      case 'rename': {
        const contents = files.get(lastMutation.newPath);
        if (!contents) throw new Error('renamed target missing');
        files.delete(lastMutation.newPath);
        files.set(lastMutation.oldPath, contents);
        break;
      }
      case 'create':
        files.delete(lastMutation.filePath);
        break;
      case 'delete':
        for (const path of lastMutation.paths) files.set(path, copy(originalContents));
        break;
    }
    return `Undo ${lastMutation.kind}`;
  });
  const dependencies: FileMutationScenarioDependencies = {
    executeMutation,
    readFile: async (_workspaceFolderUri, path) => {
      const contents = files.get(path);
      if (!contents) return undefined;
      return copy(contents);
    },
    undoLastMutation,
  };
  const refreshGraph = vi.fn(async () => undefined);
  const waitForRefreshIdle = vi.fn(async () => undefined);
  const runOperation = vi.fn(async (_operation, action) => {
    await action();
    return { elapsedMs: 12 };
  });
  const input: RunFileMutationScenarioInput = {
    dimension: 'medium',
    ordinal: 2,
    refreshGraph,
    runId: 'run-7',
    runOperation,
    scenario,
    waitForRefreshIdle,
    workspaceFolderUri,
  };

  return {
    dependencies,
    executeMutation,
    files,
    input,
    refreshGraph,
    runOperation,
    undoLastMutation,
    waitForRefreshIdle,
  };
}

describe('extension/perf/scenarios/fileMutation/run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['rename', 'create', 'delete'] as const)(
    'runs the %s production mutation through the correlated operation boundary',
    async (scenario) => {
      const harness = setup(scenario);

      const result = await runFileMutationScenario(harness.input, harness.dependencies);

      expect(harness.runOperation).toHaveBeenCalledWith(
        {
          operationId: `run-7:${scenario}:medium:2`,
          runId: 'run-7',
          scenario,
          dimension: 'medium',
        },
        expect.any(Function),
      );
      expect(harness.executeMutation).toHaveBeenCalledWith(
        result.mutation,
        {
          workspaceFolderUri,
          refreshGraph: harness.refreshGraph,
        },
      );
      expect(result).toMatchObject({
        scenario,
        dimension: 'medium',
        operationId: `run-7:${scenario}:medium:2`,
        restored: true,
      });
    },
  );

  it('waits for delayed refresh work inside the measured mutation', async () => {
    const harness = setup('rename');
    harness.input.runOperation = async (_operation, action) => {
      await action();
      expect(harness.waitForRefreshIdle).toHaveBeenCalledOnce();
    };

    await runFileMutationScenario(harness.input, harness.dependencies);
  });

  it('waits for delayed refresh work after UndoManager restoration', async () => {
    const harness = setup('delete');

    await runFileMutationScenario(harness.input, harness.dependencies);

    expect(harness.waitForRefreshIdle).toHaveBeenCalledTimes(2);
    expect(harness.undoLastMutation.mock.invocationCallOrder[0])
      .toBeLessThan(harness.waitForRefreshIdle.mock.invocationCallOrder[1]);
  });

  it.each(['rename', 'create', 'delete'] as const)(
    'restores the %s fixture bytes after measurement',
    async (scenario) => {
      const harness = setup(scenario);
      const before = [...harness.files].map(([path, contents]) => [path, [...contents]]);

      await runFileMutationScenario(harness.input, harness.dependencies);

      expect([...harness.files].map(([path, contents]) => [path, [...contents]])).toEqual(before);
      expect(harness.undoLastMutation).toHaveBeenCalledOnce();
    },
  );

  it('restores the fixture when graph acknowledgement fails after mutation', async () => {
    const harness = setup('rename');
    harness.input.runOperation = async (_operation, action) => {
      await action();
      throw new Error('graph acknowledgement timed out');
    };

    await expect(
      runFileMutationScenario(harness.input, harness.dependencies),
    ).rejects.toThrow('graph acknowledgement timed out');

    expect([...harness.files].map(([path, contents]) => [path, [...contents]])).toEqual([
      ['src/group-00000/file-000004.ts', [...originalContents]],
    ]);
    expect(harness.undoLastMutation).toHaveBeenCalledOnce();
  });

  it('does not undo when the operation fails before invoking the mutation', async () => {
    const harness = setup('delete');
    harness.input.runOperation = async () => {
      throw new Error('could not arm graph');
    };

    await expect(
      runFileMutationScenario(harness.input, harness.dependencies),
    ).rejects.toThrow('could not arm graph');

    expect(harness.undoLastMutation).not.toHaveBeenCalled();
    expect([...(harness.files.get('src/group-00000/file-000003.ts') ?? [])])
      .toEqual([...originalContents]);
  });

  it.each([
    ['rename', 'src/group-00000/file-000004.ts'],
    ['delete', 'src/group-00000/file-000003.ts'],
  ] as const)('rejects %s when its deterministic source is missing', async (scenario, path) => {
    const harness = setup(scenario);
    harness.files.delete(path);

    await expect(
      runFileMutationScenario(harness.input, harness.dependencies),
    ).rejects.toThrow(`Performance ${scenario} scenario expected ${path} to exist`);

    expect(harness.runOperation).not.toHaveBeenCalled();
  });

  it.each([
    ['rename', 'src/group-00000/file-000004.perf-renamed.ts'],
    ['create', 'src/group-00000/perf-created.ts'],
  ] as const)('rejects %s when its deterministic destination exists', async (scenario, path) => {
    const harness = setup(scenario);
    harness.files.set(path, new TextEncoder().encode('occupied'));

    await expect(
      runFileMutationScenario(harness.input, harness.dependencies),
    ).rejects.toThrow(`Performance ${scenario} scenario expected ${path} to be absent`);

    expect(harness.runOperation).not.toHaveBeenCalled();
  });

  it('fails when UndoManager does not restore the mutation', async () => {
    const harness = setup('create');
    harness.dependencies.undoLastMutation = vi.fn(async () => 'Create: perf-created.ts');

    await expect(
      runFileMutationScenario(harness.input, harness.dependencies),
    ).rejects.toThrow(
      'Performance create scenario did not restore src/group-00000/perf-created.ts',
    );
  });

  it('fails when the completed mutation is missing from UndoManager', async () => {
    const harness = setup('delete');
    harness.dependencies.undoLastMutation = vi.fn(async () => undefined);

    await expect(
      runFileMutationScenario(harness.input, harness.dependencies),
    ).rejects.toThrow('Performance delete scenario was not recorded by UndoManager');
  });
});
