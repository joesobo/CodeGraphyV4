import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScriptShape } from './shape/model';

const engine = {
  nodeIds: ['a', 'b'],
  getNodeIndex: vi.fn((nodeId: string) => ['a', 'b'].indexOf(nodeId)),
  pin: vi.fn(),
  release: vi.fn(),
  setAlphaTarget: vi.fn(),
  setConfig: vi.fn(),
  setNodePosition: vi.fn(),
  settled: false,
  x: Float32Array.from([10, 90]),
  y: Float32Array.from([20, 100]),
  tick: vi.fn(() => ({ moving: true, settled: false, steps: 1 })),
};
const createGraphLayoutEngine = vi.fn(() => engine);

vi.mock('@codegraphy-dev/graph-renderer', () => ({ createGraphLayoutEngine }));

interface HarnessOptions {
  meta?: Record<string, unknown>;
  shapes?: ScriptShape[];
}

function createHarness(options: HarnessOptions = {}) {
  let meta = options.meta ?? {};
  let shapes = options.shapes ?? [];
  const listeners = new Map<string, (payload: unknown) => void>();
  const off = vi.fn();
  const stopStoreListener = vi.fn();
  const updateShapes = vi.fn();
  let storeListener: () => void = () => undefined;
  const editor = {
    getCurrentPage: () => ({ meta }),
    getCurrentPageShapes: () => shapes,
    off,
    on: vi.fn((event: string, listener: (payload: unknown) => void) => listeners.set(event, listener)),
    run: vi.fn((operation: () => void) => operation()),
    store: {
      listen: vi.fn((listener: () => void) => {
        storeListener = listener;
        return stopStoreListener;
      }),
    },
    updateShapes,
  };
  return {
    editor,
    emit: (event: string, payload?: unknown) => listeners.get(event)?.(payload),
    notifyStore: () => storeListener(),
    off,
    setMeta: (nextMeta: Record<string, unknown>) => { meta = nextMeta; },
    setShapes: (nextShapes: ScriptShape[]) => { shapes = nextShapes; },
    stopStoreListener,
    updateShapes,
  };
}

const nodeA = {
  id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
  meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
} satisfies ScriptShape;
const nodeB = {
  id: 'shape:b', type: 'geo', x: 80, y: 80, props: { w: 120, h: 120 },
  meta: { codegraphyKind: 'node', codegraphyEntityId: 'b' },
} satisfies ScriptShape;
const edgeAB = {
  id: 'shape:edge', type: 'arrow', x: 0, y: 0, props: {},
  meta: { codegraphyKind: 'edge', codegraphyFrom: 'a', codegraphyTo: 'b' },
} satisfies ScriptShape;
const userNote = {
  id: 'shape:note', type: 'note', x: 0, y: 0, props: {}, meta: {},
} satisfies ScriptShape;

describe('tldraw physics runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engine.settled = false;
  });

  it('ticks shared physics and writes native shape movement outside undo history', async () => {
    const harness = createHarness({ shapes: [nodeA, nodeB, edgeAB, userNote] });
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: new AbortController().signal });
    harness.emit('tick', 16);

    expect(createGraphLayoutEngine).toHaveBeenCalledOnce();
    expect(createGraphLayoutEngine).toHaveBeenCalledWith(
      expect.objectContaining({ nodeIds: ['a', 'b'], edgeSources: Uint32Array.of(0) }),
      expect.any(Object),
    );
    expect(engine.tick).toHaveBeenCalledOnce();
    expect(harness.editor.run).toHaveBeenCalledWith(expect.any(Function), { history: 'ignore' });
    expect(harness.updateShapes).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'shape:a', x: -30, y: 0 }),
      expect.objectContaining({ id: 'shape:b', x: 210, y: 240 }),
    ]));

    engine.settled = true;
    harness.emit('tick', 16);
    expect(engine.tick).toHaveBeenCalledOnce();
  });

  it('rebuilds physics for graph structure changes but not delayed position updates', async () => {
    const harness = createHarness({ shapes: [nodeA] });
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: new AbortController().signal });
    harness.emit('tick', 16);
    harness.setShapes([{ ...nodeA, x: 10, y: 20 }]);
    harness.notifyStore();
    harness.emit('tick', 16);
    expect(createGraphLayoutEngine).toHaveBeenCalledOnce();

    harness.setShapes([nodeA, nodeB]);
    harness.notifyStore();
    harness.emit('tick', 16);
    expect(createGraphLayoutEngine).toHaveBeenCalledTimes(2);
  });

  it('sends only changed document force settings to the active engine', async () => {
    const physics = { repelForce: 18, centerForce: 0.15, linkDistance: 80, linkForce: 2 };
    const harness = createHarness({ meta: { codegraphyPhysics: physics }, shapes: [nodeA] });
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: new AbortController().signal });
    harness.emit('tick', 16);
    harness.notifyStore();
    expect(engine.setConfig).not.toHaveBeenCalled();

    harness.setMeta({ codegraphyPhysics: { ...physics, repelForce: 10, linkForce: 0.5 } });
    harness.notifyStore();
    expect(engine.setConfig).toHaveBeenCalledWith({
      centralGravity: 0.15,
      chargeStrength: -250,
      linkDistance: 80,
      linkStrength: 0.5,
      velocityDecay: 0.4,
    });

    const emptyHarness = createHarness({ meta: { codegraphyPhysics: physics } });
    startPhysicsRuntime({ editor: emptyHarness.editor, signal: new AbortController().signal });
    emptyHarness.setMeta({ codegraphyPhysics: { ...physics, centerForce: 0.2 } });
    expect(() => emptyHarness.notifyStore()).not.toThrow();
  });

  it('routes live pointer movement through the shared pin and release lifecycle', async () => {
    let draggedNode = nodeB;
    const harness = createHarness({ shapes: [nodeA] });
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: new AbortController().signal });
    harness.setShapes([nodeA, draggedNode]);
    harness.notifyStore();
    harness.emit('event', { type: 'pointer', name: 'pointer_down', shape: draggedNode });
    draggedNode = { ...draggedNode, x: 240, y: 120 };
    harness.setShapes([nodeA, draggedNode]);
    harness.emit('event', { type: 'pointer', name: 'pointer_move' });

    expect(createGraphLayoutEngine).toHaveBeenCalledTimes(2);
    expect(engine.pin).toHaveBeenCalledWith(1);
    expect(engine.setAlphaTarget).toHaveBeenCalledWith(0.3);
    expect(engine.setNodePosition).toHaveBeenLastCalledWith(1, 100, 60);

    draggedNode = { ...draggedNode, x: 300, y: 180 };
    harness.setShapes([nodeA, draggedNode]);
    harness.emit('tick', 16);
    expect(engine.setNodePosition).toHaveBeenLastCalledWith(1, 120, 80);

    harness.emit('event', { type: 'pointer', name: 'pointer_up' });
    expect(engine.release).toHaveBeenCalledWith(1);
    expect(engine.setAlphaTarget).toHaveBeenLastCalledWith(0);
  });

  it('removes the event, tick, and store listeners when the script stops', async () => {
    const harness = createHarness();
    const controller = new AbortController();
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: controller.signal });
    controller.abort();

    expect(harness.stopStoreListener).toHaveBeenCalledOnce();
    expect(harness.off).toHaveBeenCalledTimes(2);
    expect(harness.off).toHaveBeenCalledWith('event', expect.any(Function));
    expect(harness.off).toHaveBeenCalledWith('tick', expect.any(Function));
  });
});
