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
  it('does not let an in-flight tick overwrite a node after drag release', () => {
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
    engine.setNodePosition(0, 25, 30);
    engine.pin(0);
    engine.release(0);
    worker.onmessage?.({ data: {
      type: 'tick',
      revision: 0,
      mutationRevision: 0,
      result: { moving: true, settled: false, steps: 1 },
      x: Float32Array.of(-5).buffer,
      y: Float32Array.of(-6).buffer,
      vx: Float32Array.of(4).buffer,
      vy: Float32Array.of(5).buffer,
    } } as MessageEvent);

    expect(engine.x[0]).toBe(25);
    expect(engine.y[0]).toBe(30);
    expect(engine.vx[0]).toBe(0);
    expect(engine.vy[0]).toBe(0);
  });

  it('synchronizes plugin-owned kinematic updates before accepting worker ticks', () => {
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
    engine.setKinematics(
      Float32Array.of(12),
      Float32Array.of(13),
      Float32Array.of(2),
      Float32Array.of(3),
    );
    worker.onmessage?.({ data: {
      type: 'tick',
      revision: 0,
      mutationRevision: 0,
      result: { moving: true, settled: false, steps: 1 },
      x: Float32Array.of(-5).buffer,
      y: Float32Array.of(-6).buffer,
      vx: Float32Array.of(4).buffer,
      vy: Float32Array.of(5).buffer,
    } } as MessageEvent);

    expect(engine.x[0]).toBe(12);
    expect(engine.y[0]).toBe(13);
    expect(engine.vx[0]).toBe(2);
    expect(engine.vy[0]).toBe(3);
    expect(worker.messages).toContainEqual(expect.objectContaining({ type: 'setKinematics' }));
  });

  it('rejects an in-flight settled result after the simulation is reheated', () => {
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
    engine.reheat();
    worker.onmessage?.({ data: {
      type: 'tick',
      mutationRevision: 0,
      revision: 0,
      result: { moving: false, settled: true, steps: 1 },
      x: Float32Array.of(0).buffer,
      y: Float32Array.of(0).buffer,
      vx: Float32Array.of(0).buffer,
      vy: Float32Array.of(0).buffer,
    } } as MessageEvent);

    expect(engine.settled).toBe(false);
    expect(worker.messages.filter(message => (message as { type?: string }).type === 'tick'))
      .toHaveLength(2);
  });

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
      mutationRevision: 0,
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
