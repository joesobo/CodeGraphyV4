import type { IndexCodeGraphyWorkspaceOptions, IndexCodeGraphyWorkspaceResult } from './contracts';
import { applyWorkspaceEngineChangedFiles } from './engineChanges';
import { indexWorkspaceEngine } from './engineIndex';
import { createWorkspaceEngineRuntime, hasWorkspaceEngineIndexState } from './engineRuntime';

export interface CodeGraphyWorkspaceEngine {
  applyChangedFiles(filePaths: readonly string[]): Promise<IndexCodeGraphyWorkspaceResult>;
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
  return { applyChangedFiles, index };
}
