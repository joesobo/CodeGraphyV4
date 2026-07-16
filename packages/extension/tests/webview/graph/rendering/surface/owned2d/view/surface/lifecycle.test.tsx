import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurfaceProps } from './fixture';

const rendererHarness = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn(),
  render: vi.fn(),
  setSecondarySurface: vi.fn(),
}));

vi.unmock('../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/render');
vi.mock('@codegraphy-dev/graph-renderer', async importOriginal => ({
  ...await importOriginal<typeof import('@codegraphy-dev/graph-renderer')>(),
  WebGpuGraphRenderer: class WebGpuGraphRenderer {
    static create(...arguments_: unknown[]) {
      return rendererHarness.create(...arguments_);
    }
  },
}));

import { OwnedGraphSurface2d } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/render';

describe('OwnedGraphSurface2d renderer lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    rendererHarness.create.mockReset();
    rendererHarness.dispose.mockReset();
    rendererHarness.render.mockReset();
    rendererHarness.setSecondarySurface.mockReset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('PointerEvent', MouseEvent);
  });

  it('activates WebGPU as the sole graph renderer', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
    });
    const { container } = render(<OwnedGraphSurface2d {...createDefaultSurfaceProps()} />);

    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    expect(container.firstElementChild).toHaveAttribute('data-codegraphy-physics', 'wasm');
    expect(container.querySelectorAll('canvas')).toHaveLength(3);
    expect(rendererHarness.setSecondarySurface).toHaveBeenCalledWith(
      screen.getByTestId('graph-minimap').querySelector('canvas'),
    );
    expect(screen.queryByTestId('graph-webgpu-error')).not.toBeInTheDocument();
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
      setSecondarySurface: rendererHarness.setSecondarySurface,
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

  it('does not retain or render a secondary surface while the minimap is disabled', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
    });
    const props = createDefaultSurfaceProps();
    props.showMinimap = false;
    const { container, rerender } = render(<OwnedGraphSurface2d {...props} />);

    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(rendererHarness.setSecondarySurface).not.toHaveBeenCalled();

    rerender(<OwnedGraphSurface2d {...props} showMinimap />);
    expect(container.querySelectorAll('canvas')).toHaveLength(3);
    expect(rendererHarness.setSecondarySurface).toHaveBeenCalledWith(
      screen.getByTestId('graph-minimap').querySelector('canvas'),
    );

    rerender(<OwnedGraphSurface2d {...props} showMinimap={false} />);
    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(rendererHarness.setSecondarySurface).toHaveBeenLastCalledWith(undefined);
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
