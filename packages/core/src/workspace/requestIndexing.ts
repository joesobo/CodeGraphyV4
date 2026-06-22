import * as path from 'node:path';
import { createDiagnosticEvent } from '../diagnostics/events';
import { indexCodeGraphyWorkspace } from '../indexing/workspace';
import { resolveCodeGraphyWorkspacePath } from './requestPaths';
import type { IndexWorkspaceResult, WorkspacePathInput } from './requestTypes';

export interface WorkspaceIndexDependencies {
  cwd(): string;
}

const DEFAULT_DEPENDENCIES: WorkspaceIndexDependencies = {
  cwd: () => process.cwd(),
};

let indexOperationCounter = 0;

function createIndexOperationId(): string {
  indexOperationCounter += 1;
  return `index-${indexOperationCounter}`;
}

export async function requestCodeGraphyIndexWorkspace(
  input: WorkspacePathInput,
  dependencies: WorkspaceIndexDependencies = DEFAULT_DEPENDENCIES,
): Promise<IndexWorkspaceResult> {
  const workspaceRoot = resolveCodeGraphyWorkspacePath(input.workspacePath, dependencies.cwd());
  const operationId = createIndexOperationId();
  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'workspace',
    event: 'index-started',
    context: {
      operationId,
      workspaceRoot,
    },
  }));
  const result = await indexCodeGraphyWorkspace({
    workspaceRoot,
    ...(input.diagnostics ? { diagnostics: input.diagnostics } : {}),
  });
  const graphCache = path.relative(result.workspaceRoot, result.graphCachePath);

  input.diagnostics?.emit(createDiagnosticEvent({
    area: 'indexing',
    event: 'completed',
    context: {
      operationId,
      graphCache,
      files: result.files.length,
      nodes: result.graph.nodes.length,
      edges: result.graph.edges.length,
    },
  }));

  return {
    workspaceRoot: result.workspaceRoot,
    graphCache,
    message: 'CodeGraphy indexing completed. Query tools can now read the Graph Cache.',
    files: result.files.length,
    nodes: result.graph.nodes.length,
    edges: result.graph.edges.length,
  };
}
