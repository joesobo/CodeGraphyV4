import { describe, expect, it } from 'vitest';
import { clipboardFilesMessageSchema } from '../../../src/shared/protocol/clipboardFiles';

describe('shared/protocol/clipboardFiles', () => {
  it.each(['CUT_FILES', 'COPY_FILES'] as const)('accepts a non-empty %s path list', (type) => {
    expect(clipboardFilesMessageSchema.parse({
      type,
      payload: { paths: ['src/app.ts', 'src/lib'] },
    })).toEqual({ type, payload: { paths: ['src/app.ts', 'src/lib'] } });
  });

  it('accepts a non-empty paste destination', () => {
    expect(clipboardFilesMessageSchema.parse({
      type: 'PASTE_FILES',
      payload: { directory: 'src' },
    })).toEqual({ type: 'PASTE_FILES', payload: { directory: 'src' } });
  });

  it.each([
    { type: 'CUT_FILES', payload: { paths: [] } },
    { type: 'COPY_FILES', payload: { paths: [''] } },
    { type: 'PASTE_FILES', payload: { directory: '' } },
  ])('rejects an empty clipboard file payload', (message) => {
    expect(clipboardFilesMessageSchema.safeParse(message).success).toBe(false);
  });
});
