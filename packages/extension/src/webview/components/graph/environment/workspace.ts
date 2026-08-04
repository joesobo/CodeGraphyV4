interface WorkspaceDocumentLike {
  body?: {
    dataset?: {
      codegraphyWorkspaceName?: string;
    };
  };
}

export function readGraphWorkspaceName(documentLike: WorkspaceDocumentLike | undefined): string {
  return documentLike?.body?.dataset?.codegraphyWorkspaceName?.trim() || 'Workspace';
}
