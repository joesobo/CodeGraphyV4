// @vitest-environment jsdom

import {
  createShapeId,
  createTLStore,
  defaultBindingUtils,
  defaultShapeTools,
  defaultShapeUtils,
  defaultTools,
  Editor,
} from 'tldraw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@codegraphy-dev/graph-renderer', () => ({
  createGraphLayoutEngine,
  graphNodeSizeChargeMultiplier: (size: number, defaultSize: number) => size / defaultSize,
}));

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
  const getCurrentPage = vi.fn(() => ({ meta }));
  let storeListener: () => void = () => undefined;
  const editor = {
    getCurrentPage,
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
    getCurrentPage,
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
const labelA = {
  id: 'shape:label-a', type: 'text', x: 0, y: 0, props: { w: 180 },
  meta: { codegraphyKind: 'label', codegraphyNodeId: 'a' },
} satisfies ScriptShape;
const userNote = {
  id: 'shape:note', type: 'note', x: 0, y: 0, props: {}, meta: {},
} satisfies ScriptShape;

describe('tldraw physics runtime', () => {
  const realEditors: Editor[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    engine.settled = false;
  });

  afterEach(() => {
    for (const editor of realEditors) editor.dispose();
    realEditors.length = 0;
  });

  it('receives a real tldraw translation as a physics drag', async () => {
    const shapeUtils = [...defaultShapeUtils];
    const bindingUtils = [...defaultBindingUtils];
    const editor = new Editor({
      bindingUtils,
      getContainer: () => document.body,
      initialState: 'select',
      shapeUtils,
      store: createTLStore({ bindingUtils, shapeUtils }),
      tools: [...defaultTools, ...defaultShapeTools],
    });
    realEditors.push(editor);
    const nodeId = createShapeId('codegraphy-node-a');
    editor.createShape({
      id: nodeId,
      meta: { codegraphyEntityId: 'a', codegraphyKind: 'node' },
      props: { geo: 'ellipse', h: 120, w: 120 },
      type: 'geo',
      x: 0,
      y: 0,
    });
    const { startPhysicsRuntime } = await import('./runtime');
    startPhysicsRuntime({
      editor: editor as unknown as Parameters<typeof startPhysicsRuntime>[0]['editor'],
      signal: new AbortController().signal,
    });
    const node = editor.getShape(nodeId);
    if (!node) throw new Error('Expected real tldraw node');
    const event = {
      accelKey: false,
      altKey: false,
      button: 0,
      ctrlKey: false,
      isPen: false,
      metaKey: false,
      pointerId: 1,
      shiftKey: false,
      type: 'pointer' as const,
    };

    editor.dispatch({ ...event, name: 'pointer_down', point: { x: 60, y: 60 }, shape: node, target: 'shape' });
    editor.dispatch({ ...event, name: 'pointer_move', point: { x: 300, y: 180 }, target: 'canvas' });
    editor.emit('tick', 16);

    expect(engine.pin).toHaveBeenCalledWith(0);
    expect(engine.setNodePosition).toHaveBeenCalled();
  });

  it('ticks shared physics and writes native shape movement outside undo history', async () => {
    const harness = createHarness({ shapes: [nodeA, nodeB, edgeAB, labelA, userNote] });
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: new AbortController().signal });
    harness.emit('tick', 16);

    expect(createGraphLayoutEngine).toHaveBeenCalledOnce();
    expect(createGraphLayoutEngine).toHaveBeenCalledWith(
      expect.objectContaining({ nodeIds: ['a', 'b'], edgeSources: Uint32Array.of(0) }),
      expect.any(Object),
    );
    expect(engine.tick).toHaveBeenCalledOnce();
    expect(harness.editor.run).toHaveBeenCalledWith(expect.any(Function), {
      history: 'ignore',
      ignoreShapeLock: true,
    });
    expect(harness.updateShapes).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'shape:a', x: -10, y: 40 }),
      expect.objectContaining({ id: 'shape:b', x: 390, y: 440 }),
      expect.objectContaining({ id: 'shape:label-a', x: -40, y: 168 }),
    ]));

    engine.settled = true;
    harness.emit('tick', 16);
    expect(engine.tick).toHaveBeenCalledOnce();
  });

  it('does not inspect the full graph for its own position updates', async () => {
    const harness = createHarness({ shapes: [nodeA, nodeB, edgeAB] });
    harness.updateShapes.mockImplementation(() => harness.notifyStore());
    const { startPhysicsRuntime } = await import('./runtime');

    startPhysicsRuntime({ editor: harness.editor, signal: new AbortController().signal });
    expect(harness.getCurrentPage).toHaveBeenCalledOnce();

    harness.emit('tick', 16);

    expect(harness.getCurrentPage).toHaveBeenCalledOnce();
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

    harness.setShapes([{ ...nodeA, props: { ...nodeA.props, w: 240 } }, nodeB]);
    harness.notifyStore();
    harness.emit('tick', 16);
    expect(createGraphLayoutEngine).toHaveBeenCalledTimes(3);
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
    expect(engine.setNodePosition).toHaveBeenLastCalledWith(1, 60, 36);

    draggedNode = { ...draggedNode, x: 300, y: 180 };
    harness.setShapes([nodeA, draggedNode]);
    harness.emit('tick', 16);
    expect(engine.setNodePosition).toHaveBeenLastCalledWith(1, 72, 48);

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
