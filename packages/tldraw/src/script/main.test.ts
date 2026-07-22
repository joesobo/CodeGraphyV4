import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const prepareGraphPhysicsFromBytes = vi.fn(async (_bytes: Uint8Array) => undefined);
const createGraphLayoutEngine = vi.fn(() => engine);

vi.mock('@codegraphy-dev/graph-renderer', () => ({
  createGraphLayoutEngine,
  prepareGraphPhysicsFromBytes,
}));

describe('CodeGraphy tldraw document script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs shared physics on the editor tick and writes shape movement outside undo history', async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    const updateShapes = vi.fn();
    const storeListener = vi.fn();
    const editor = {
      getCurrentPage: () => ({ meta: {} }),
      getCurrentPageShapes: () => [
        {
          id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
          meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
        },
        {
          id: 'shape:b', type: 'geo', x: 80, y: 80, props: { w: 120, h: 120 },
          meta: { codegraphyKind: 'node', codegraphyEntityId: 'b' },
        },
      ],
      off: vi.fn(),
      on: vi.fn((event: string, listener: (payload: unknown) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn(() => storeListener) },
      updateShapes,
    };
    const signal = new AbortController().signal;
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal });
    listeners.get('tick')?.(16);

    expect(prepareGraphPhysicsFromBytes).toHaveBeenCalledOnce();
    const preparedBytes = prepareGraphPhysicsFromBytes.mock.calls[0]?.[0];
    expect(String.fromCharCode(...Array.from(preparedBytes ?? []))).toBe('CODEGRAPHY_PHYSICS_WASM');
    expect(createGraphLayoutEngine).toHaveBeenCalledOnce();
    expect(engine.tick).toHaveBeenCalledOnce();
    expect(editor.run).toHaveBeenCalledWith(expect.any(Function), { history: 'ignore' });
    expect(updateShapes).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'shape:a', x: -30, y: 0 }),
      expect.objectContaining({ id: 'shape:b', x: 210, y: 240 }),
    ]));
  });

  it('normalizes native circle geometry to the Extension physics scale', async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    const editor = {
      getCurrentPage: () => ({ meta: {} }),
      getCurrentPageShapes: () => [{
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
      }],
      off: vi.fn(),
      on: vi.fn((event: string, listener: (payload: unknown) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn(() => vi.fn()) },
      updateShapes: vi.fn(),
    };
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal: new AbortController().signal });
    listeners.get('tick')?.(16);

    expect(createGraphLayoutEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        initialX: Float32Array.of(20),
        initialY: Float32Array.of(20),
        radii: Float32Array.of(20),
      }),
      {
        centralGravity: 0.1,
        chargeStrength: -250,
        collisionPadding: 8 / 3,
        linkDistance: 80,
        linkStrength: 1,
        velocityDecay: 0.4,
      },
    );
  });

  it('rebuilds physics for graph structure changes but not delayed position updates', async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    let storeListener: (entry: object) => void = () => undefined;
    const nodeShape = {
      id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
      meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
    };
    let nodeShapes = [nodeShape];
    const editor = {
      getCurrentPage: () => ({ meta: {} }),
      getCurrentPageShapes: () => nodeShapes,
      off: vi.fn(),
      on: vi.fn((event: string, listener: (payload: unknown) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn((listener: (entry: object) => void) => {
        storeListener = listener;
        return vi.fn();
      }) },
      updateShapes: vi.fn(),
    };
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal: new AbortController().signal });
    listeners.get('tick')?.(16);
    storeListener({
      changes: {
        added: {},
        removed: {},
        updated: {
          'shape:a': [nodeShape, { ...nodeShape, x: 10, y: 20 }],
        },
      },
      source: 'user',
    });
    listeners.get('tick')?.(16);

    expect(createGraphLayoutEngine).toHaveBeenCalledOnce();

    nodeShapes = [nodeShape, {
      ...nodeShape,
      id: 'shape:b',
      meta: { codegraphyKind: 'node', codegraphyEntityId: 'b' },
    }];
    storeListener({ changes: { added: {}, removed: {}, updated: {} }, source: 'user' });
    listeners.get('tick')?.(16);

    expect(createGraphLayoutEngine).toHaveBeenCalledTimes(2);
  });

  it('sends changed document force settings to the active graph-renderer engine', async () => {
    const listeners = new Map<string, (payload: unknown) => void>();
    let storeListener: () => void = () => undefined;
    let physics = {
      repelForce: 18,
      centerForce: 0.15,
      linkDistance: 80,
      linkForce: 2,
    };
    const editor = {
      getCurrentPage: () => ({ meta: { codegraphyPhysics: physics } }),
      getCurrentPageShapes: () => [{
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 20, h: 20 },
        meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
      }],
      off: vi.fn(),
      on: vi.fn((event: string, listener: (payload: unknown) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn((listener: () => void) => {
        storeListener = listener;
        return vi.fn();
      }) },
      updateShapes: vi.fn(),
    };
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal: new AbortController().signal });
    listeners.get('tick')?.(16);
    physics = { ...physics, repelForce: 10, linkForce: 0.5 };
    storeListener();

    expect(engine.setConfig).toHaveBeenLastCalledWith({
      centralGravity: 0.15,
      chargeStrength: -250,
      linkDistance: 80,
      linkStrength: 0.5,
      velocityDecay: 0.4,
    });
  });

  it('pins, moves, reheats, and releases a node through the shared drag lifecycle', async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    let nodeShape = {
      id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
      meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
    };
    const editor = {
      getCurrentPage: () => ({ meta: {} }),
      getCurrentPageShapes: () => [nodeShape],
      off: vi.fn(),
      on: vi.fn((event: string, listener: (payload: unknown) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn(() => vi.fn()) },
      updateShapes: vi.fn(),
    };
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal: new AbortController().signal });
    listeners.get('tick')?.(16);
    listeners.get('event')?.({
      type: 'pointer',
      name: 'pointer_down',
      target: 'shape',
      shape: nodeShape,
    });
    listeners.get('event')?.({ type: 'pointer', name: 'pointer_up', target: 'selection' });

    expect(engine.pin).not.toHaveBeenCalled();
    expect(engine.setAlphaTarget).not.toHaveBeenCalled();

    listeners.get('event')?.({
      type: 'pointer',
      name: 'pointer_down',
      target: 'shape',
      shape: nodeShape,
    });
    nodeShape = { ...nodeShape, x: 240, y: 120 };
    listeners.get('event')?.({ type: 'pointer', name: 'pointer_move', target: 'selection' });

    expect(engine.pin).toHaveBeenCalledWith(0);
    expect(engine.setAlphaTarget).toHaveBeenCalledWith(0.3);
    expect(engine.setNodePosition).toHaveBeenLastCalledWith(0, 100, 60);

    listeners.get('event')?.({ type: 'pointer', name: 'pointer_up', target: 'selection' });

    expect(engine.release).toHaveBeenCalledWith(0);
    expect(engine.setAlphaTarget).toHaveBeenLastCalledWith(0);
  });
});
