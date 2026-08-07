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
  const layout = {
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
    pause: vi.fn(),
    pin: vi.fn(),
    release: vi.fn(),
    setAlphaTarget: vi.fn(),
    setConfig: vi.fn(),
    setNodePosition: vi.fn(),
    tick: vi.fn(() => tickResult),
    x: new Float32Array([0]),
    y: new Float32Array([0]),
  };
  return {
    createGraphLayoutEngine: vi.fn((_input: unknown, _config?: unknown) => layout),
    layout,
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

const physicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 1,
  damping: 0.4,
  centerForce: 0.1,
};

function renderedZoom(frame: unknown): number {
  if (typeof frame !== 'object' || frame === null || !('camera' in frame)) {
    throw new Error('Renderer frame has no camera.');
  }
  const camera = frame.camera;
  if (typeof camera !== 'object' || camera === null || !('zoom' in camera) || typeof camera.zoom !== 'number') {
    throw new Error('Renderer frame has no zoom.');
  }
  return camera.zoom;
}

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
    Object.defineProperties(HTMLCanvasElement.prototype, {
      hasPointerCapture: { configurable: true, value: vi.fn(() => true) },
      releasePointerCapture: { configurable: true, value: vi.fn() },
      setPointerCapture: { configurable: true, value: vi.fn() },
    });
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
      root.render(<GraphPanel graph={graph} onSelectionChange={() => undefined} physicsSettings={physicsSettings} revision={1} />);
    });

    expect(rendererMocks.prepareGraphPhysics).toHaveBeenCalledOnce();
    expect(rendererMocks.createGraphLayoutEngine).not.toHaveBeenCalled();

    await act(async () => {
      rendererMocks.resolvePhysics();
    });

    expect(rendererMocks.createGraphLayoutEngine).toHaveBeenCalledOnce();
    expect(rendererMocks.createGraphLayoutEngine.mock.calls[0]).toHaveLength(2);
    expect(rendererMocks.createGraphLayoutEngine.mock.calls[0]?.[0]).toMatchObject({
      chargeStrengthMultipliers: new Float32Array([1]),
      radii: new Float32Array([12]),
    });
    expect(rendererMocks.createGraphLayoutEngine.mock.calls[0]?.[1]).toEqual({
      centralGravity: 0.1,
      chargeStrength: -250,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
    });
    await act(async () => root.unmount());
  });

  it('replaces both rendering surfaces for each Core graph revision', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<GraphPanel graph={graph} onSelectionChange={() => undefined} physicsSettings={physicsSettings} revision={1} />);
    });
    const firstCanvases = [...host.querySelectorAll('canvas')];

    await act(async () => {
      root.render(<GraphPanel graph={graph} onSelectionChange={() => undefined} physicsSettings={physicsSettings} revision={2} />);
    });
    const secondCanvases = [...host.querySelectorAll('canvas')];

    expect(secondCanvases[0]).not.toBe(firstCanvases[0]);
    expect(secondCanvases[1]).not.toBe(firstCanvases[1]);
    await act(async () => root.unmount());
  });

  it('routes hover, drag, background deselection, pan, and viewport controls through the renderer', async () => {
    const animationFrames: FrameRequestCallback[] = [];
    rendererMocks.setRendererEnabled(true);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
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
    const onSelect = vi.fn();

    await act(async () => {
      root.render(<GraphPanel graph={graph} onSelectionChange={onSelect} physicsSettings={physicsSettings} revision={1} />);
    });
    await act(async () => {
      rendererMocks.resolvePhysics();
    });
    await act(async () => animationFrames.shift()?.(0));
    const canvas = host.querySelector<HTMLCanvasElement>('.graph-canvas');

    await act(async () => {
      canvas?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 50, clientY: 50 }));
    });
    await act(async () => animationFrames.shift()?.(16));
    expect(rendererMocks.render.mock.lastCall?.[0]).toMatchObject({
      hoveredNodeIndex: 0,
      hoveredNodeScale: 1.1,
    });

    await act(async () => {
      canvas?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
      canvas?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
    });
    expect(onSelect).toHaveBeenCalledWith('src/index.ts');

    await act(async () => {
      canvas?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 50, clientY: 50 }));
      canvas?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 58, clientY: 50 }));
      canvas?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 58, clientY: 50 }));
    });
    expect(rendererMocks.layout.pin).toHaveBeenCalledWith(0);
    expect(rendererMocks.layout.setAlphaTarget).toHaveBeenNthCalledWith(1, 0.3);
    expect(rendererMocks.layout.setNodePosition).toHaveBeenCalledWith(0, expect.any(Number), expect.any(Number));
    expect(rendererMocks.layout.release).toHaveBeenCalledWith(0);
    expect(rendererMocks.layout.setAlphaTarget).toHaveBeenLastCalledWith(0);

    onSelect.mockClear();
    await act(async () => {
      canvas?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 95, clientY: 95 }));
      canvas?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 95, clientY: 95 }));
    });
    expect(onSelect).toHaveBeenCalledWith(undefined);

    onSelect.mockClear();
    await act(async () => {
      canvas?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 95, clientY: 95 }));
      canvas?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 88, clientY: 95 }));
      canvas?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 88, clientY: 95 }));
    });
    expect(onSelect).not.toHaveBeenCalled();

    await act(async () => animationFrames.splice(0).forEach(callback => callback(32)));
    const zoomBeforeControl = renderedZoom(rendererMocks.render.mock.lastCall?.[0]);
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Zoom In"]')?.click());
    await act(async () => animationFrames.splice(0).forEach(callback => callback(48)));
    expect(renderedZoom(rendererMocks.render.mock.lastCall?.[0])).toBeGreaterThan(zoomBeforeControl);
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Fit to Screen"]')?.click());
    await act(async () => animationFrames.splice(0).forEach(callback => callback(64)));
    expect(renderedZoom(rendererMocks.render.mock.lastCall?.[0])).toBe(zoomBeforeControl);
    await act(async () => root.unmount());
  });

  it('keeps Folder Nodes selectable in the desktop Relationship inspector', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onSelectionChange = vi.fn();
    const graphWithFolder: DesktopGraph = {
      nodes: [
        { id: 'src/index.ts', label: 'index.ts', nodeType: 'file' },
        { id: 'src', label: 'src', nodeType: 'folder' },
      ],
      edges: [{ id: 'nested', from: 'src', to: 'src/index.ts', kind: 'nests' }],
    };
    await act(async () => root.render(
      <GraphPanel
        graph={graphWithFolder}
        onSelectionChange={onSelectionChange}
        physicsSettings={physicsSettings}
        revision={1}
        selectedId="src/index.ts"
      />,
    ));

    const folder = host.querySelector<HTMLButtonElement>('.relationship-list button');
    expect(folder?.disabled).toBe(false);
    await act(async () => folder?.click());
    expect(onSelectionChange).toHaveBeenCalledWith('src');
    await act(async () => root.unmount());
  });

  it('applies force changes live without recreating Core graph or WebGPU state', async () => {
    const animationFrames: FrameRequestCallback[] = [];
    rendererMocks.setRendererEnabled(true);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
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
      root.render(<GraphPanel graph={graph} onSelectionChange={() => undefined} physicsSettings={physicsSettings} revision={1} />);
    });
    await act(async () => {
      rendererMocks.resolvePhysics();
    });
    await act(async () => animationFrames.shift()?.(0));
    const firstFrame = rendererMocks.render.mock.lastCall?.[0] as Record<string, unknown>;

    await act(async () => {
      root.render(
        <GraphPanel
          graph={graph}
          onSelectionChange={() => undefined}
          physicsSettings={{ ...physicsSettings, repelForce: 20 }}
          revision={1}
          selectedId="src/index.ts"
        />,
      );
    });
    await act(async () => animationFrames.shift()?.(16));
    const secondFrame = rendererMocks.render.mock.lastCall?.[0] as Record<string, unknown>;

    expect(rendererMocks.layout.setConfig).toHaveBeenCalledWith(expect.objectContaining({
      chargeStrength: -500,
    }));
    expect(rendererMocks.webGpuCreate).toHaveBeenCalledOnce();
    expect(secondFrame.getLinkColor).toBe(firstFrame.getLinkColor);
    expect(secondFrame.getNodeStyle).toBe(firstFrame.getNodeStyle);
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
      root.render(<GraphPanel graph={graph} onSelectionChange={() => undefined} physicsSettings={physicsSettings} revision={1} />);
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
