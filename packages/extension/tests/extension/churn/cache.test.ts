import { describe, expect, it, vi } from 'vitest';
import { readCachedChurn, writeCachedChurn } from '../../../src/extension/churn/cache';

describe('churn cache', () => {
  it('round-trips counts for one repository head', async () => {
    const values = new Map<string, unknown>();
    const state = {
      get: <T>(key: string): T | undefined => values.get(key) as T | undefined,
      update: vi.fn(async (key: string, value: unknown) => {
        values.set(key, value);
      }),
    };

    await writeCachedChurn(state, 'abc123', 'files-v1', { 'src/app.ts': 4 });

    expect(state.update).toHaveBeenCalledOnce();
    expect(readCachedChurn(state, 'abc123', 'files-v1')).toEqual({ 'src/app.ts': 4 });
    expect(readCachedChurn(state, 'different', 'files-v1')).toBeNull();
    expect(readCachedChurn(state, 'abc123', 'files-v2')).toBeNull();
  });
});
