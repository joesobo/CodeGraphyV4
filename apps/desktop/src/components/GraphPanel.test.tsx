import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesktopGraph } from '../model';

const rendererMocks = vi.hoisted(() => {
  let rendererEnabled = false;
  let resolvePhysics: (() => void) | undefined;
  let tickResult = { settled: true, steps: 0 };
  const prepareGraphPhysics = vi.fn(() => new Promise<void>((resolve) => {
    resolvePhysics = resolve;
  }));
  const render = vi.fn((_frame: unknown) => undefined);
  const renderer = {
    canRender: vi.fn(() => true),
    dispose: vi.fn(),
    render,
  };
  return {
    createGraphLayoutEngine: vi.fn((_input: unknown) => ({
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
      pause: vi.fn(),
      tick: vi.fn(() => tickResult),
      x: new Float32Array([0]),
      y: new Float32Array([0]),
    })),
    prepareGraphPhysics,
    render,
    resolvePhysics: () => resolvePhysics?.(),
    setRendererEnabled: (enabled: boolean) => { rendererEnabled = enabled; },
    setTickResult: (result: { settled: boolean; steps: number }) => { tickResult = result; },
    webGpuCreate: vi.fn(async () => rendererEnabled ? renderer : undefined),
  };
});

vi.mock('@codegraphy-dev/graph-renderer', () => ({
  createGraphLayoutEngine: rendererMocks.createGraphLayoutEngine,
  graphDetailOpacity: vi.fn(() => 1),
  graphNodeSizeChargeMultiplier: vi.fn(() => 1),
  graphNodeWorldScale: vi.fn(() => 1),
  prepareGraphPhysics: rendererMocks.prepareGraphPhysics,
  shouldRenderGraphDetails: vi.fn(() => true),
  WebGpuGraphRenderer: {
    create: rendererMocks.webGpuCreate,
  },
}));

vi.mock('../materialIconTheme', () => ({
  resolveMaterialIcon: vi.fn(async () => undefined),
}));

import { GraphPanel } from './GraphPanel';

const graph: DesktopGraph = {
  edges: [],
  nodes: [{ id: 'src/index.ts', label: 'index.ts', nodeType: 'file' }],
};

describe('GraphPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rendererMocks.setRendererEnabled(false);
    rendererMocks.setTickResult({ settled: true, steps: 0 });
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('ResizeObserver', class {
      disconnect(): void {}
      observe(): void {}
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(rendererMocks.createGraphLayoutEngine.mock.calls[0]).toHaveLength(1);
    expect(rendererMocks.createGraphLayoutEngine.mock.calls[0]?.[0]).toMatchObject({
      chargeStrengthMultipliers: new Float32Array([1]),
      radii: new Float32Array([12]),
    });
    await act(async () => root.unmount());
  });

  it('renders one concrete-color frame while reduced-motion physics settles', async () => {
    const animationFrames: FrameRequestCallback[] = [];
    rendererMocks.setRendererEnabled(true);
    rendererMocks.setTickResult({ settled: false, steps: 8 });
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query.includes('reduced-motion') || query.includes('forced-colors'),
    })));
    vi.stubGlobal('getComputedStyle', vi.fn((element: Element) => ({
      color: element instanceof HTMLElement && element.style.color.toLowerCase() === 'canvas'
        ? 'rgb(10, 11, 12)'
        : element instanceof HTMLElement && element.style.color.toLowerCase() === 'highlight'
          ? 'rgb(104, 213, 188)'
          : 'rgb(127, 139, 144)',
      getPropertyValue: () => '',
    } as unknown as CSSStyleDeclaration)));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      translate: vi.fn(),
    } as never);

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<GraphPanel graph={graph} onSelect={() => undefined} />);
    });
    await act(async () => {
      rendererMocks.resolvePhysics();
    });
    await act(async () => {
      animationFrames.shift()?.(0);
    });

    expect(rendererMocks.render).toHaveBeenCalledOnce();
    expect(rendererMocks.render.mock.calls[0]?.[0]).toMatchObject({
      backgroundColor: 'rgb(10, 11, 12)',
    });
    expect(animationFrames).toHaveLength(0);
    await act(async () => root.unmount());
  });
});
