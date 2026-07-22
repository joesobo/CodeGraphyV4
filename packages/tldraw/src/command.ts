import path from 'node:path';
import type { IGraphData } from '@codegraphy-dev/core';

export interface TldrawDocumentWriteInput {
  graph: IGraphData;
  targetPath: string;
  workspaceRoot: string;
}

export interface TldrawCommandDependencies {
  resolveDefaultDocumentPath(workspaceRoot: string): string;
  cwd(): string;
  findOpenDocument(documentPath: string): Promise<{ id: string } | undefined>;
  indexWorkspace(workspaceRoot: string): Promise<{ graph: IGraphData }>;
  openDocument(documentPath: string): Promise<void>;
  refreshOpenDocument(input: {
    documentId: string;
    graph: IGraphData;
    workspaceRoot: string;
  }): Promise<void>;
  writeDocument(input: TldrawDocumentWriteInput): Promise<{ documentPath: string }>;
}

export interface TldrawCommandResult {
  documentPath: string;
  workspaceRoot: string;
}

export async function runTldrawCommand(
  arguments_: readonly string[],
  dependencies: TldrawCommandDependencies,
): Promise<TldrawCommandResult> {
  const workspaceRoot = path.resolve(dependencies.cwd());
  const targetPath = arguments_[0]
    ? path.resolve(workspaceRoot, arguments_[0])
    : dependencies.resolveDefaultDocumentPath(workspaceRoot);
  const { graph } = await dependencies.indexWorkspace(workspaceRoot);
  const openDocument = await dependencies.findOpenDocument(targetPath);
  let documentPath = targetPath;
  if (openDocument) {
    await dependencies.refreshOpenDocument({
      documentId: openDocument.id,
      graph,
      workspaceRoot,
    });
  } else {
    const document = await dependencies.writeDocument({ graph, targetPath, workspaceRoot });
    documentPath = document.documentPath;
  }
  await dependencies.openDocument(documentPath);
  return { documentPath, workspaceRoot };
}
