import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { applyWorkspaceEngineChangedFiles } from './engineChanges';
import { indexWorkspaceEngine } from './engineIndex';
import { createWorkspaceEngineRuntime, hasWorkspaceEngineIndexState } from './engineRuntime';

export interface CodeGraphyWorkspaceEngine {
  applyChangedFiles(filePaths: readonly string[]): Promise<IndexCodeGraphyWorkspaceResult>;
  dispose(): void;
  index(): Promise<IndexCodeGraphyWorkspaceResult>;
}

export function createCodeGraphyWorkspaceEngine(
  options: IndexCodeGraphyWorkspaceOptions,
): CodeGraphyWorkspaceEngine {
  const runtime = createWorkspaceEngineRuntime(options);
  const index = () => indexWorkspaceEngine(runtime);
  const applyChangedFiles = (filePaths: readonly string[]) => (
    hasWorkspaceEngineIndexState(runtime.state)
      ? applyWorkspaceEngineChangedFiles(runtime, filePaths, index)
      : index()
  );
  const dispose = () => {
    runtime.state.registry?.disposeAll();
    runtime.state.registry = undefined;
  };
  return { applyChangedFiles, dispose, index };
}
