export function createFirstWorkspaceReadyState(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((resolved) => {
    resolve = resolved;
  });

  return { promise, resolve };
}
