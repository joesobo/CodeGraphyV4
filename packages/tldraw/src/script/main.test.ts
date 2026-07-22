import { beforeEach, describe, expect, it, vi } from 'vitest';

const engine = {
  nodeIds: ['a', 'b'],
  setConfig: vi.fn(),
  settled: false,
  x: Float32Array.from([10, 90]),
  y: Float32Array.from([20, 100]),
  tick: vi.fn(() => ({ moving: true, settled: false, steps: 1 })),
};
const prepareGraphPhysicsFromBytes = vi.fn(async () => undefined);
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
    const listeners = new Map<string, (elapsed: number) => void>();
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
      on: vi.fn((event: string, listener: (elapsed: number) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn(() => storeListener) },
      updateShapes,
    };
    const signal = new AbortController().signal;
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal });
    listeners.get('tick')?.(16);

    expect(prepareGraphPhysicsFromBytes).toHaveBeenCalledOnce();
    expect(createGraphLayoutEngine).toHaveBeenCalledOnce();
    expect(engine.tick).toHaveBeenCalledOnce();
    expect(editor.run).toHaveBeenCalledWith(expect.any(Function), { history: 'ignore' });
    expect(updateShapes).toHaveBeenCalled();
  });

  it('uses Extension physics defaults independently of the native circle size', async () => {
    const listeners = new Map<string, (elapsed: number) => void>();
    const editor = {
      getCurrentPage: () => ({ meta: {} }),
      getCurrentPageShapes: () => [{
        id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 120, h: 120 },
        meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
      }],
      off: vi.fn(),
      on: vi.fn((event: string, listener: (elapsed: number) => void) => listeners.set(event, listener)),
      run: vi.fn((operation: () => void) => operation()),
      store: { listen: vi.fn(() => vi.fn()) },
      updateShapes: vi.fn(),
    };
    const { default: runDocumentScript } = await import('./main');

    await runDocumentScript({ editor, signal: new AbortController().signal });
    listeners.get('tick')?.(16);

    expect(createGraphLayoutEngine).toHaveBeenCalledWith(
      expect.objectContaining({ radii: Float32Array.of(20) }),
      {
        centralGravity: 0.1,
        chargeStrength: -250,
        linkDistance: 80,
        linkStrength: 1,
        velocityDecay: 0.4,
      },
    );
  });

  it('sends changed document force settings to the active graph-renderer engine', async () => {
    const listeners = new Map<string, (elapsed: number) => void>();
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
      on: vi.fn((event: string, listener: (elapsed: number) => void) => listeners.set(event, listener)),
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
});
