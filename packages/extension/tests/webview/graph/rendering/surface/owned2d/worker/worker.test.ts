import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  GraphLayoutTransferBuffers,
  GraphLayoutWorkerCommand,
  GraphLayoutWorkerTickMessage,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/protocol';

interface WorkerScope {
  onmessage?: (event: MessageEvent<GraphLayoutWorkerCommand>) => void;
  postMessage: ReturnType<typeof vi.fn>;
}

function outputSet(): GraphLayoutTransferBuffers {
  return {
    x: new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT),
    y: new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT),
    vx: new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT),
    vy: new ArrayBuffer(Float32Array.BYTES_PER_ELEMENT),
  };
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

  it('cycles only the two initialized output sets while applying commands in order', () => {
    const send = (data: GraphLayoutWorkerCommand): void => {
      scope.onmessage?.({ data } as MessageEvent<GraphLayoutWorkerCommand>);
    };
    const first = outputSet();
    const second = outputSet();
    send({
      type: 'init',
      revision: 4,
      outputBuffers: [first, second],
      input: {
        nodeIds: ['a'],
        initialX: Float32Array.of(0),
        initialY: Float32Array.of(0),
        radii: Float32Array.of(4),
        edgeSources: new Uint32Array(),
        edgeTargets: new Uint32Array(),
      },
    });
    send({
      type: 'setConfig',
      config: { centralGravity: 0 },
      mutationRevision: 1,
      structuralRevision: 1,
    });
    const kinematics = outputSet();
    new Float32Array(kinematics.x)[0] = 10;
    new Float32Array(kinematics.y)[0] = 20;
    new Float32Array(kinematics.vx)[0] = 1;
    new Float32Array(kinematics.vy)[0] = 2;
    send({
      type: 'setKinematics',
      buffers: kinematics,
      mutationRevision: 2,
      revision: 4,
    });
    send({ type: 'setNodePosition', index: 0, mutationRevision: 3, x: 30, y: 40 });
    send({ type: 'pin', index: 0, mutationRevision: 4 });
    send({ type: 'release', index: 0, mutationRevision: 5 });
    send({
      type: 'setHidden',
      index: 0,
      hidden: false,
      mutationRevision: 6,
      structuralRevision: 2,
    });
    send({ type: 'setAlpha', alpha: 0.4, mutationRevision: 7 });
    send({ type: 'setAlphaTarget', alpha: 0.2, mutationRevision: 8 });
    send({ type: 'reheat', alpha: 0.5, mutationRevision: 9 });
    send({ type: 'pause', mutationRevision: 10 });
    send({ type: 'resume', mutationRevision: 11 });
    send({ type: 'tick', revision: 99 });
    expect(scope.postMessage.mock.calls.filter(call => call[0].type === 'tick')).toHaveLength(0);

    send({ type: 'tick', revision: 4 });
    const tickMessages = () => scope.postMessage.mock.calls
      .map(call => call[0])
      .filter(message => message.type === 'tick') as GraphLayoutWorkerTickMessage[];
    const firstMessage = tickMessages()[0];
    expect(firstMessage).toMatchObject({
      buffers: first,
      mutationRevision: 11,
      revision: 4,
      structuralRevision: 2,
      type: 'tick',
    });
    expect(Number.isFinite(firstMessage.alpha)).toBe(true);
    expect(Number.isFinite(new Float32Array(firstMessage.buffers.x)[0])).toBe(true);

    send({ type: 'tick', revision: 4 });
    const secondMessage = tickMessages()[1];
    expect(secondMessage.buffers).toBe(second);

    send({
      type: 'tick',
      recycledBuffers: [first],
      revision: 4,
    });
    const thirdMessage = tickMessages()[2];
    expect(thirdMessage.buffers).toBe(first);
  });
});
