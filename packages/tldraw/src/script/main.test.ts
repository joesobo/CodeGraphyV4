import { beforeEach, describe, expect, it, vi } from 'vitest';

const engine = {
  nodeIds: ['a', 'b'],
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
      getCurrentPageShapes: () => [
        {
          id: 'shape:a', type: 'geo', x: 0, y: 0, props: { w: 20, h: 20 },
          meta: { codegraphyKind: 'node', codegraphyEntityId: 'a' },
        },
        {
          id: 'shape:b', type: 'geo', x: 80, y: 80, props: { w: 20, h: 20 },
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
});
