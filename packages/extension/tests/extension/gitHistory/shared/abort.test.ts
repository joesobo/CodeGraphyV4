import { describe, expect, it } from 'vitest';
import { createAbortError } from '../../../../src/extension/gitHistory/shared/abort';

describe('gitHistory/shared/abort', () => {
  it('creates a named abort error', () => {
    const error = createAbortError();

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Indexing aborted');
    expect(error.name).toBe('AbortError');
  });
});
