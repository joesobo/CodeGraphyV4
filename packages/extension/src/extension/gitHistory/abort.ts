export function createAbortError(): Error {
  const error = new Error('Indexing aborted');
  error.name = 'AbortError';
  return error;
}

export const createIndexingAbortError = createAbortError;
