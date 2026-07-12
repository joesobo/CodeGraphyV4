import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLayoutWorkerCommand } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/protocol';

interface WorkerScope {
  onmessage?: (event: MessageEvent<GraphLayoutWorkerCommand>) => void;
  postMessage: ReturnType<typeof vi.fn>;
}

describe('owned graph layout worker command routing', () => {
  let scope: WorkerScope;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    vi.resetModules();
    scope = { postMessage: vi.fn() };
    vi.stubGlobal('self', scope);
    await import('../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/worker');
  });

  it('applies every simulation command in order and publishes the latest revision', () => {
    const send = (data: GraphLayoutWorkerCommand): void => {
      scope.onmessage?.({ data } as MessageEvent<GraphLayoutWorkerCommand>);
    };
    send({
      type: 'init',
      revision: 4,
      input: {
        nodeIds: ['a'],
        initialX: Float32Array.of(0),
        initialY: Float32Array.of(0),
        radii: Float32Array.of(4),
        edgeSources: new Uint32Array(),
        edgeTargets: new Uint32Array(),
      },
    });
    send({ type: 'setConfig', config: { centralGravity: 0 }, mutationRevision: 1 });
    send({
      type: 'setKinematics',
      mutationRevision: 2,
      x: Float32Array.of(10).buffer,
      y: Float32Array.of(20).buffer,
      vx: Float32Array.of(1).buffer,
      vy: Float32Array.of(2).buffer,
    });
    send({ type: 'setNodePosition', index: 0, mutationRevision: 3, x: 30, y: 40 });
    send({ type: 'pin', index: 0, mutationRevision: 4 });
    send({ type: 'release', index: 0, mutationRevision: 5 });
    send({ type: 'setHidden', index: 0, hidden: false, mutationRevision: 6 });
    send({ type: 'reheat', alpha: 0.5, mutationRevision: 7 });
    send({ type: 'pause', mutationRevision: 8 });
    send({ type: 'resume', mutationRevision: 9 });
    send({ type: 'tick', elapsedMs: 1000 / 60, revision: 99 });
    expect(scope.postMessage).not.toHaveBeenCalled();
    send({ type: 'tick', elapsedMs: 1000 / 60, revision: 4 });

    expect(scope.postMessage).toHaveBeenCalledOnce();
    const message = scope.postMessage.mock.calls[0][0] as {
      mutationRevision: number;
      revision: number;
      type: string;
      x: ArrayBuffer;
      y: ArrayBuffer;
    };
    expect(message).toMatchObject({ type: 'tick', mutationRevision: 9, revision: 4 });
    expect(Number.isFinite(new Float32Array(message.x)[0])).toBe(true);
    expect(Number.isFinite(new Float32Array(message.y)[0])).toBe(true);
  });
});
