import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurfaceProps } from '../view/surfaceFixture';

const rendererHarness = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn(),
  render: vi.fn(),
}));

vi.unmock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/view');
vi.mock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/webgpu/renderer', () => ({
  OwnedWebGpuRenderer: class OwnedWebGpuRenderer {
    static create(...arguments_: unknown[]) {
      return rendererHarness.create(...arguments_);
    }
  },
}));

import { OwnedGraphSurface2d } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/view';
import { TypedGraphLayoutEngine } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/engine';

describe('OwnedGraphSurface2d renderer lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    rendererHarness.create.mockReset();
    rendererHarness.dispose.mockReset();
    rendererHarness.render.mockReset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('PointerEvent', MouseEvent);
  });

  it('activates WebGPU as the sole graph renderer', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
    const { container } = render(<OwnedGraphSurface2d {...createDefaultSurfaceProps()} />);

    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(screen.queryByTestId('graph-webgpu-error')).not.toBeInTheDocument();
  });

  it('routes a Ctrl-click on a node to additive selection without starting a node drag', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
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
    const props = createDefaultSurfaceProps();
    const node = {
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'selected-node',
      isFavorite: false,
      isPinned: false,
      label: 'selected-node',
      size: 8,
      x: 0,
      y: 0,
    };
    props.sharedProps.graphData = { links: [], nodes: [node] } as never;
    const { container } = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });

    const overlay = container.querySelectorAll('canvas')[1];
    fireEvent.pointerDown(overlay, {
      button: 0,
      clientX: 50,
      clientY: 50,
      ctrlKey: true,
      pointerId: 1,
    });
    fireEvent.pointerUp(overlay, {
      button: 0,
      clientX: 50,
      clientY: 50,
      ctrlKey: true,
      pointerId: 1,
    });

    expect(props.sharedProps.onNodeClick).toHaveBeenCalledWith(node, expect.any(MouseEvent));
    expect(props.sharedProps.onNodeDragEnd).not.toHaveBeenCalled();

    vi.mocked(props.sharedProps.onNodeClick).mockClear();
    fireEvent.pointerDown(overlay, {
      button: 0,
      clientX: 50,
      clientY: 50,
      ctrlKey: true,
      pointerId: 2,
    });
    fireEvent.pointerMove(overlay, {
      buttons: 1,
      clientX: 60,
      clientY: 50,
      ctrlKey: true,
      pointerId: 2,
    });
    fireEvent.pointerUp(overlay, {
      button: 0,
      clientX: 60,
      clientY: 50,
      ctrlKey: true,
      pointerId: 2,
    });

    expect(props.sharedProps.onNodeClick).not.toHaveBeenCalled();
  });

  it('holds a warm alpha target during node drag and cools on release', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
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
    const setAlphaTarget = vi.spyOn(TypedGraphLayoutEngine.prototype, 'setAlphaTarget');
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData = { links: [], nodes: [{
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'dragged-node',
      isFavorite: false,
      isPinned: false,
      label: 'dragged-node',
      size: 8,
      x: 0,
      y: 0,
    }] } as never;
    const { container } = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    const overlay = container.querySelectorAll('canvas')[1];
    overlay.setPointerCapture = vi.fn();
    overlay.hasPointerCapture = vi.fn(() => true);
    overlay.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(overlay, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    expect(setAlphaTarget).not.toHaveBeenCalledWith(0.3);

    fireEvent.pointerMove(overlay, { buttons: 1, clientX: 60, clientY: 50, pointerId: 1 });
    expect(setAlphaTarget).toHaveBeenLastCalledWith(0.3);
    fireEvent.pointerUp(overlay, { button: 0, clientX: 60, clientY: 50, pointerId: 1 });
    expect(setAlphaTarget).toHaveBeenLastCalledWith(0);
  });

  it('keeps sub-threshold pointer jitter as a stationary click', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
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
    const setAlphaTarget = vi.spyOn(TypedGraphLayoutEngine.prototype, 'setAlphaTarget');
    const props = createDefaultSurfaceProps();
    props.sharedProps.onNodeDrag = vi.fn();
    const node = {
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'clicked-node',
      isFavorite: false,
      isPinned: false,
      label: 'clicked-node',
      size: 8,
      x: 0,
      y: 0,
    };
    props.sharedProps.graphData = { links: [], nodes: [node] } as never;
    const { container } = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    const overlay = container.querySelectorAll('canvas')[1];
    overlay.setPointerCapture = vi.fn();
    overlay.hasPointerCapture = vi.fn(() => true);
    overlay.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(overlay, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(overlay, { buttons: 1, clientX: 51, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(overlay, { button: 0, clientX: 51, clientY: 50, pointerId: 1 });

    expect(node).toMatchObject({ x: 0, y: 0 });
    expect(props.sharedProps.onNodeDrag).not.toHaveBeenCalled();
    expect(props.sharedProps.onNodeClick).toHaveBeenCalledWith(node, expect.any(MouseEvent));
    expect(setAlphaTarget).not.toHaveBeenCalledWith(0.3);
  });

  it('attributes React and runtime reconciliation only during an armed session', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
    const props = createDefaultSurfaceProps();
    const rendered = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(props.fg2dRef.current).toBeDefined();
    });
    props.fg2dRef.current!.startStageAttributionRecording();

    const nextProps = {
      ...props,
      sharedProps: {
        ...props.sharedProps,
        graphData: {
          links: [...props.sharedProps.graphData.links],
          nodes: [...props.sharedProps.graphData.nodes],
        },
      },
    };
    rendered.rerender(<OwnedGraphSurface2d {...nextProps} />);
    expect(props.fg2dRef.current?.stopStageAttributionRecording()).toMatchObject({
      stages: {
        propsRuntimeReconciliation: { eventCount: 1 },
        reactReconciliation: { eventCount: 1 },
      },
    });
  });

  it('applies plugin viewport kinematics to the owned layout', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
    const props = createDefaultSurfaceProps();
    const node = {
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'plugin-node',
      isFavorite: false,
      isPinned: false,
      label: 'plugin-node',
      size: 8,
      x: 0,
      y: 0,
    };
    props.sharedProps.graphData = { links: [], nodes: [node] } as never;
    const rendered = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(rendered.container.firstElementChild).toHaveAttribute(
        'data-codegraphy-renderer',
        'webgpu',
      );
    });

    expect(props.fg2dRef.current?.updateNode('plugin-node', {
      fx: 30,
      fy: 40,
      isPinned: true,
      vx: 2,
      vy: 3,
      x: 30,
      y: 40,
    })).toBe(true);
    expect(node).toMatchObject({ isPinned: true, vx: 2, vy: 3, x: 30, y: 40 });

    expect(props.fg2dRef.current?.updateNode('plugin-node', { isPinned: false })).toBe(true);
    expect(node).toMatchObject({ fx: undefined, fy: undefined, isPinned: false });
    expect(props.fg2dRef.current?.updateNode('missing', { x: 1 })).toBe(false);
  });

  it('ends an active drag when a graph update removes its primary node', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
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
    const setAlphaTarget = vi.spyOn(TypedGraphLayoutEngine.prototype, 'setAlphaTarget');
    const props = createDefaultSurfaceProps();
    props.sharedProps.onNodeDrag = vi.fn();
    const node = {
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'removed-node',
      isFavorite: false,
      isPinned: false,
      label: 'removed-node',
      size: 8,
      x: 0,
      y: 0,
    };
    props.sharedProps.graphData = { links: [], nodes: [node] } as never;
    const rendered = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(rendered.container.firstElementChild).toHaveAttribute(
        'data-codegraphy-renderer',
        'webgpu',
      );
    });
    const overlay = rendered.container.querySelectorAll('canvas')[1];
    overlay.setPointerCapture = vi.fn();
    overlay.hasPointerCapture = vi.fn(() => false);
    overlay.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(overlay, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(overlay, { buttons: 1, clientX: 60, clientY: 50, pointerId: 1 });
    expect(props.sharedProps.onNodeDrag).toHaveBeenCalled();

    const nextProps = { ...props, sharedProps: {
      ...props.sharedProps,
      graphData: { links: [], nodes: [] },
    } };
    rendered.rerender(<OwnedGraphSurface2d {...nextProps} />);

    expect(props.sharedProps.onNodeDragEnd).toHaveBeenCalledWith(node);
    expect(setAlphaTarget).toHaveBeenLastCalledWith(0);
  });

  it('recreates WebGPU resources when the device is lost', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.mocked(requestAnimationFrame).mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    const context = {
      clearRect: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData = { links: [], nodes: [{
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'active-node',
      isFavorite: false,
      isPinned: false,
      label: 'active-node',
      size: 8,
    }] } as never;
    const { container } = render(<OwnedGraphSurface2d {...props} />);
    const overlay = container.querySelectorAll('canvas')[1];
    Object.defineProperty(overlay, 'getContext', { value: () => context });
    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    act(() => frames.shift()?.(0));
    expect(frames.length).toBeGreaterThan(0);
    const options = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };

    act(() => options.onDeviceLost('GPU reset'));

    expect(container.firstElementChild).toHaveAttribute(
      'data-codegraphy-renderer',
      'initializing',
    );
    expect(rendererHarness.dispose).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(rendererHarness.create).toHaveBeenCalledTimes(2);
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    act(() => frames.shift()?.(1000 / 60));
    const styleVersions = rendererHarness.render.mock.calls.map(
      ([frame]) => (frame as { styleVersion: number }).styleVersion,
    );
    expect(new Set(styleVersions).size).toBe(1);
    expect(screen.queryByTestId('graph-webgpu-error')).not.toBeInTheDocument();
  });

  it('shows potential and displayed performance while tracking remains always on', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.mocked(requestAnimationFrame).mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    const context = {
      clearRect: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      translate: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
    });
    const props = createDefaultSurfaceProps();
    props.showFps = true;
    props.sharedProps.graphData = { links: [], nodes: [{
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'fps-node',
      isFavorite: false,
      isPinned: false,
      label: 'fps-node',
      size: 8,
    }] } as never;
    const rendered = render(<OwnedGraphSurface2d {...props} />);
    const overlay = rendered.container.querySelectorAll('canvas')[1];
    Object.defineProperty(overlay, 'getContext', { value: () => context });
    await waitFor(() => {
      expect(rendered.container.firstElementChild).toHaveAttribute(
        'data-codegraphy-renderer',
        'webgpu',
      );
    });

    act(() => frames.shift()?.(0));
    act(() => frames.shift()?.(20));

    const output = await screen.findByTestId('graph-fps');
    expect(output).toHaveTextContent(/Potential \d+ FPS · Displayed 50 FPS/);
    expect(output).toHaveTextContent(/Frame .* ms avg · .* ms max · 1% high .* ms/);
    expect(output).toHaveTextContent(/Sim .* ms avg · .* ms max · 1% high .* ms/);
    expect(output).toHaveTextContent(/Render .* ms avg · .* ms max · 1% high .* ms/);
    expect(output).toHaveAttribute('data-performance-status', 'active');
    expect(output).toHaveAttribute('data-displayed-fps', '50');
    expect(Number(output.dataset.potentialFps)).toBeGreaterThan(0);
    expect(Number(output.dataset.sampleCount)).toBeGreaterThan(0);
    expect(Number(output.dataset.simulationMaximumMs)).toBeGreaterThanOrEqual(0);
    expect(Number(output.dataset.renderOnePercentHighMs)).toBeGreaterThanOrEqual(0);
    expect(props.fg2dRef.current?.getFps()).toBe(50);

    rendered.rerender(<OwnedGraphSurface2d {...props} />);
    expect(screen.getByTestId('graph-fps')).toHaveTextContent(/Displayed 50 FPS/);
    const styleVersions = rendererHarness.render.mock.calls.map(
      ([frame]) => (frame as { styleVersion: number }).styleVersion,
    );
    expect(new Set(styleVersions).size).toBe(1);

    rendered.rerender(<OwnedGraphSurface2d {...props} showFps={false} />);
    expect(screen.queryByTestId('graph-fps')).not.toBeInTheDocument();
    expect(props.fg2dRef.current?.getFps()).toBe(50);

    rendered.rerender(<OwnedGraphSurface2d {...props} />);
    expect(screen.getByTestId('graph-fps')).toHaveTextContent(/Displayed 50 FPS/);

    const options = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
    };
    await act(async () => {
      options.onDeviceLost('GPU reset');
      await Promise.resolve();
    });
    expect(screen.getByTestId('graph-fps')).toBeVisible();
    expect(screen.getByTestId('graph-fps')).toHaveTextContent('Idle');
    expect(screen.getByTestId('graph-fps')).toHaveAttribute('data-performance-status', 'idle');
    expect(props.fg2dRef.current?.getFps()).toBeNull();
  });

  it('shows an explicit error instead of switching to a Canvas graph renderer', async () => {
    rendererHarness.create.mockResolvedValue(undefined);
    const props = createDefaultSurfaceProps();
    const { container } = render(<OwnedGraphSurface2d {...props} />);

    expect(await screen.findByTestId('graph-webgpu-error')).toHaveTextContent(
      'WebGPU is unavailable in this environment.',
    );
    expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'error');
    expect(container.querySelector('[data-codegraphy-renderer="canvas2d"]')).not.toBeInTheDocument();

  });
});
