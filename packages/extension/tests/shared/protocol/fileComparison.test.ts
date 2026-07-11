import { describe, expect, it } from 'vitest';
import { fileComparisonMessageSchema } from '../../../src/shared/protocol/fileComparison';

describe('shared/protocol/fileComparison', () => {
  it('accepts two non-empty workspace paths', () => {
    expect(fileComparisonMessageSchema.parse({
      type: 'COMPARE_FILES',
      payload: { leftPath: 'src/app.ts', rightPath: 'src/next.ts' },
    })).toEqual({
      type: 'COMPARE_FILES',
      payload: { leftPath: 'src/app.ts', rightPath: 'src/next.ts' },
    });
  });

  it.each([
    { type: 'COMPARE_FILES' },
    { type: 'COMPARE_FILES', payload: { leftPath: '', rightPath: 'src/next.ts' } },
    { type: 'COMPARE_FILES', payload: { leftPath: 'src/app.ts', rightPath: 42 } },
  ])('rejects malformed comparison payloads', (message) => {
    expect(fileComparisonMessageSchema.safeParse(message).success).toBe(false);
  });
});
