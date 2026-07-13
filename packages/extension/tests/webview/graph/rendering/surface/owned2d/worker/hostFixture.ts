import { vi } from 'vitest';
import type {
  GraphLayoutTransferBuffers,
  GraphLayoutWorkerCommand,
  GraphLayoutWorkerTickMessage,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/protocol';

interface FakeWorker {
  onerror: ((event: ErrorEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  messages: GraphLayoutWorkerCommand[];
  terminate: ReturnType<typeof vi.fn>;
  transfers: Transferable[][];
}

const workerHarness = vi.hoisted(() => ({
  instances: [] as FakeWorker[],
}));

vi.mock('../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/worker?worker&inline', () => ({
  default: class FakeWorkerImplementation implements FakeWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    messages: GraphLayoutWorkerCommand[] = [];
    transfers: Transferable[][] = [];
    terminate = vi.fn();

    constructor() {
      workerHarness.instances.push(this);
    }

    postMessage(message: GraphLayoutWorkerCommand, transfer: Transferable[] = []): void {
      this.messages.push(message);
      this.transfers.push(transfer);
    }
  },
}));

import { createWorkerHostedGraphLayoutEngine } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/worker/host';

export function createEngine(onUpdate = vi.fn(), onFrameRequest = onUpdate) {
  const engine = createWorkerHostedGraphLayoutEngine({
    nodeIds: ['a'],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    radii: Float32Array.of(4),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, onUpdate, onFrameRequest);
  return { engine, onFrameRequest, onUpdate, worker: workerHarness.instances.at(-1)! };
}

export function outputBuffers(worker: FakeWorker): GraphLayoutTransferBuffers[] {
  const init = worker.messages.find(command => command.type === 'init');
  if (!init || init.type !== 'init') throw new Error('missing worker init');
  return [...init.outputBuffers];
}

export function publishTick(
  worker: FakeWorker,
  buffers: GraphLayoutTransferBuffers,
  overrides: Partial<GraphLayoutWorkerTickMessage> = {},
  x = 5,
): void {
  new Float32Array(buffers.x)[0] = x;
  new Float32Array(buffers.y)[0] = 6;
  new Float32Array(buffers.vx)[0] = 1;
  new Float32Array(buffers.vy)[0] = 2;
  worker.onmessage?.({ data: {
    alpha: 0.42,
    buffers,
    mutationRevision: 0,
    revision: 0,
    result: { moving: true, settled: false, steps: 1 },
    type: 'tick',
    ...overrides,
  } } as MessageEvent);
}

export function tickCommands(worker: FakeWorker) {
  return worker.messages.filter(
    (command): command is Extract<GraphLayoutWorkerCommand, { type: 'tick' }> =>
      command.type === 'tick',
  );
}
