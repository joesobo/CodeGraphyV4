import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../../src/fixture/presets';
import { startGraphBenchmarkServer } from '../../../src/harness/currentRenderer/server';

describe('startGraphBenchmarkServer', () => {
  it('serves the benchmark bootstrap before the webview bundle and streams its graph', async () => {
    const fixture = createSyntheticFixture('1k', 307);
    const server = await startGraphBenchmarkServer(fixture);

    try {
      const html = await fetch(server.url).then((response) => response.text());
      const graph = await fetch(new URL('/fixture.json', server.url)).then((response) =>
        response.json() as Promise<{ nodes: unknown[]; edges: unknown[] }>,
      );
      const wasmResponse = await fetch(new URL('/dist/webview/index.wasm', server.url));
      const wasmBytes = await wasmResponse.arrayBuffer();

      expect(html.indexOf('window.acquireVsCodeApi')).toBeLessThan(
        html.indexOf('/dist/webview/index.js'),
      );
      expect(graph.nodes).toHaveLength(1_000);
      expect(graph.edges).toHaveLength(3_090);
      expect(wasmResponse.status).toBe(200);
      expect(wasmResponse.headers.get('content-type')).toBe('application/wasm');
      expect(WebAssembly.validate(wasmBytes)).toBe(true);
    } finally {
      await server.close();
    }
  });
});
