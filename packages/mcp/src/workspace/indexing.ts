import * as path from 'node:path';
import { indexCodeGraphyWorkspace } from '@codegraphy/core';
import type { IndexWorkspaceResult, WorkspacePathInput } from './model';
import { resolveCodeGraphyWorkspacePath } from './paths';

export interface WorkspaceIndexDependencies {
  cwd(): string;
}

const DEFAULT_DEPENDENCIES: WorkspaceIndexDependencies = {
  cwd: () => process.cwd(),
};

export async function requestCodeGraphyIndexWorkspace(
  input: WorkspacePathInput,
  dependencies: WorkspaceIndexDependencies = DEFAULT_DEPENDENCIES,
): Promise<IndexWorkspaceResult> {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const result = await indexCodeGraphyWorkspace({ workspaceRoot });

  return {
    workspaceRoot: result.workspaceRoot,
    graphCache: path.relative(result.workspaceRoot, result.graphCachePath),
    message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
    files: result.files.length,
    nodes: result.graph.nodes.length,
    edges: result.graph.edges.length,
  };
}
