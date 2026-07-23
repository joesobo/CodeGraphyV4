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
  const index = async () => {
    assertWorkspaceEngineActive(runtime);
    return indexWorkspaceEngine(runtime);
  };
  const applyChangedFiles = async (filePaths: readonly string[]) => {
    assertWorkspaceEngineActive(runtime);
    return hasWorkspaceEngineIndexState(runtime.state)
      ? applyWorkspaceEngineChangedFiles(runtime, filePaths, index)
      : index();
  };
  const dispose = () => {
    runtime.disposed = true;
    runtime.state.registry?.disposeAll();
    runtime.state.registry = undefined;
  };
  return { applyChangedFiles, dispose, index };
}
