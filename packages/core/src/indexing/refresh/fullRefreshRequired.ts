export type WorkspaceIndexFullRefreshReason = 'discovery-lifecycle' | 'plugin-request';

export class WorkspaceIndexFullRefreshRequiredError extends Error {
  readonly name = 'WorkspaceIndexFullRefreshRequiredError';

  constructor(readonly reason: WorkspaceIndexFullRefreshReason) {
    super('The workspace change cannot be updated safely with targeted Indexing.');
  }
}
