export type WorkspaceIndexFullRefreshReason =
  | 'discovery-lifecycle'
  | 'discovery-membership'
  | 'plugin-request';

export class WorkspaceIndexFullRefreshRequiredError extends Error {
  readonly name = 'WorkspaceIndexFullRefreshRequiredError';

  constructor(readonly reason: WorkspaceIndexFullRefreshReason) {
    super('The workspace change cannot be updated safely with targeted Indexing.');
  }
}
