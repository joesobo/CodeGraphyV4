import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesktopGraph } from '../model';

const rendererMocks = vi.hoisted(() => {
  let resolvePhysics: (() => void) | undefined;
  const prepareGraphPhysics = vi.fn(() => new Promise<void>((resolve) => {
    resolvePhysics = resolve;
  }));
  return {
    createGraphLayoutEngine: vi.fn(() => ({
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
      pause: vi.fn(),
      tick: vi.fn(() => ({ settled: true, steps: 0 })),
      x: new Float32Array([0]),
      y: new Float32Array([0]),
    })),
    prepareGraphPhysics,
    resolvePhysics: () => resolvePhysics?.(),
  };
});

vi.mock('@codegraphy-dev/graph-renderer', () => ({
  createGraphLayoutEngine: rendererMocks.createGraphLayoutEngine,
  prepareGraphPhysics: rendererMocks.prepareGraphPhysics,
  WebGpuGraphRenderer: {
    create: vi.fn(async () => undefined),
  },
}));

import { GraphPanel } from './GraphPanel';

const graph: DesktopGraph = {
  edges: [],
  nodes: [{ id: 'src/index.ts', label: 'index.ts', nodeType: 'file' }],
};

describe('GraphPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', class {
      disconnect(): void {}
      observe(): void {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('prepares the renderer WASM before it creates the layout engine', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<GraphPanel graph={graph} onSelect={() => undefined} />);
    });

    expect(rendererMocks.prepareGraphPhysics).toHaveBeenCalledOnce();
    expect(rendererMocks.createGraphLayoutEngine).not.toHaveBeenCalled();

    await act(async () => {
      rendererMocks.resolvePhysics();
    });

    expect(rendererMocks.createGraphLayoutEngine).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });
});
