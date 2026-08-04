export class WorkspaceCacheUpdateHandledError extends Error {
  constructor(public readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'WorkspaceCacheUpdateHandledError';
  }
}

const AggregateErrorBase = (globalThis as unknown as {
  AggregateError: new (errors: Iterable<unknown>, message?: string) => Error & {
    readonly errors: readonly unknown[];
  };
}).AggregateError;

export class WorkspaceCacheUpdateUnrecordedError extends AggregateErrorBase {
  constructor(updateError: unknown, staleMarkError: unknown) {
    super(
      [updateError, staleMarkError],
      'The workspace cache update failed and its stale state could not be recorded.',
    );
    this.name = 'WorkspaceCacheUpdateUnrecordedError';
  }
}
