import path from 'node:path';

export function resolveDefaultDocumentPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'CodeGraphy.tldraw');
}
