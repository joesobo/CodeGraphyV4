import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { applyWorkspaceEngineChangedFiles } from './engineChanges';
import { indexWorkspaceEngine } from './engineIndex';
import {
  assertWorkspaceEngineActive,
  createWorkspaceEngineRuntime,
  hasWorkspaceEngineIndexState,
} from './engineRuntime';

export interface CodeGraphyWorkspaceEngine {
  applyChangedFiles(filePaths: readonly string[]): Promise<IndexCodeGraphyWorkspaceResult>;
  dispose(): void;
  index(): Promise<IndexCodeGraphyWorkspaceResult>;
}

export function createCodeGraphyWorkspaceEngine(
  options: IndexCodeGraphyWorkspaceOptions,
): CodeGraphyWorkspaceEngine {
  const runtime = createWorkspaceEngineRuntime(options);
  const activeOperations = new Set<Promise<unknown>>();
  let operationTail: Promise<void> = Promise.resolve();
  const disposeRegistry = () => {
    runtime.state.registry?.disposeAll();
    runtime.state.registry = undefined;
  };
  const trackOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
    assertWorkspaceEngineActive(runtime);
    const result = operationTail.then(() => {
      assertWorkspaceEngineActive(runtime);
      return operation();
    });
    operationTail = result.then(
      () => undefined,
      () => undefined,
    );
    activeOperations.add(result);
    try {
      return await result;
    } finally {
      activeOperations.delete(result);
      if (runtime.disposed && activeOperations.size === 0) {
        disposeRegistry();
      }
    }
  };
  const index = () => trackOperation(() => indexWorkspaceEngine(runtime));
  const applyChangedFiles = (filePaths: readonly string[]) => trackOperation(() => (
    hasWorkspaceEngineIndexState(runtime.state)
      ? applyWorkspaceEngineChangedFiles(
          runtime,
          filePaths,
          () => indexWorkspaceEngine(runtime),
        )
      : indexWorkspaceEngine(runtime)
  ));
  const dispose = () => {
    runtime.disposed = true;
    if (activeOperations.size === 0) {
      disposeRegistry();
    }
  };
  return { applyChangedFiles, dispose, index };
}
