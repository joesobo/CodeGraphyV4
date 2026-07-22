import { describe, expect, it, vi } from 'vitest';
import { TldrawApiClient } from './api';

describe('TldrawApiClient', () => {
  it('finds an exact open document and executes a live reconciliation with bearer authentication', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        result: [{ id: 'tldr:file:abc', filePath: '/workspace/graph.tldraw', name: 'graph.tldraw' }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, result: { updated: 1 } }), {
        status: 200,
      }));
    const client = new TldrawApiClient({ port: 7236, token: 'secret' }, fetch);

    await expect(client.findOpenDocument('/workspace/graph.tldraw')).resolves.toMatchObject({
      id: 'tldr:file:abc',
    });
    await client.reconcileShapes('tldr:file:abc', [{
      id: 'shape:a',
      typeName: 'shape',
      type: 'geo',
      x: 0,
      y: 0,
      rotation: 0,
      index: 'a1',
      parentId: 'page:page',
      isLocked: false,
      opacity: 1,
      props: {},
      meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
    }]);

    expect(fetch.mock.calls[0]?.[0]).toBe('http://127.0.0.1:7236/api/search');
    const firstHeaders = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(firstHeaders.get('Authorization')).toBe('Bearer secret');
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:7236/api/doc/tldr:file:abc/exec',
      expect.objectContaining({ method: 'POST' }),
    );
    const rawReconciliationBody = fetch.mock.calls[1]?.[1]?.body;
    if (typeof rawReconciliationBody !== 'string') throw new Error('Expected JSON request body');
    const reconciliationBody = JSON.parse(rawReconciliationBody) as { code: string };
    expect(reconciliationBody.code).toContain("{ history: 'ignore', ignoreShapeLock: true }");
  });
});
