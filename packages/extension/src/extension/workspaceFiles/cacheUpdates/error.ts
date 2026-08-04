export class WorkspaceCacheUpdateHandledError extends Error {
  constructor(public readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'WorkspaceCacheUpdateHandledError';
  }
}
