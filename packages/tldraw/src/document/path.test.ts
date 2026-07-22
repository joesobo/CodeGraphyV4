import { describe, expect, it } from 'vitest';
import { resolveDefaultDocumentPath } from './path';

describe('resolveDefaultDocumentPath', () => {
  it('uses the stable CodeGraphy document path in the workspace', () => {
    expect(resolveDefaultDocumentPath('/workspace')).toBe(
      '/workspace/CodeGraphy.tldraw',
    );
  });
});
