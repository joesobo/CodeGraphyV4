import { describe, expect, it, vi } from 'vitest';

const workerHarness = vi.hoisted(() => ({
  instances: [] as Array<{
    onmessage: ((event: MessageEvent) => void) | null;
    messages: unknown[];
  }>,
}));

vi.mock('../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/worker?worker&inline', () => ({
  default: class FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    messages: unknown[] = [];
    constructor() {
      workerHarness.instances.push(this);
    }
    postMessage(message: unknown): void {
      this.messages.push(message);
    }
    terminate(): void {}
  },
}));

import { createWorkerHostedGraphLayoutEngine } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/host';

describe('worker-hosted graph layout lifecycle', () => {
  it('does not post more worker ticks after the layout settles', () => {
    const engine = createWorkerHostedGraphLayoutEngine({
      nodeIds: ['a'],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(4),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, vi.fn());
    const worker = workerHarness.instances.at(-1)!;

    engine.tick(1000 / 60);
    expect(worker.messages.filter(message => (message as { type?: string }).type === 'tick')).toHaveLength(1);

    worker.onmessage?.({ data: {
      type: 'tick',
      revision: 0,
      result: { moving: false, settled: true, steps: 1 },
      x: Float32Array.of(0).buffer,
      y: Float32Array.of(0).buffer,
      vx: Float32Array.of(0).buffer,
      vy: Float32Array.of(0).buffer,
    } } as MessageEvent);
    engine.tick(1000 / 60);

    expect(worker.messages.filter(message => (message as { type?: string }).type === 'tick')).toHaveLength(1);
  });
});
