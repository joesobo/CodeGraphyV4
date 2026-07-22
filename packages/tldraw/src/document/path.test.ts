import { describe, expect, it, vi } from 'vitest';
import { createNewDocumentPath } from './path';

describe('createNewDocumentPath', () => {
  it('uses the first available CodeGraphy document name in the workspace', async () => {
    const exists = vi.fn(async (documentPath: string) => (
      documentPath.endsWith('/CodeGraphy.tldraw')
    ));

    await expect(createNewDocumentPath('/workspace', exists)).resolves.toBe(
      '/workspace/CodeGraphy 2.tldraw',
    );
  });
});
