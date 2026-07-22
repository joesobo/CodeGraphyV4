import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurfaceProps } from '../surface/fixture';

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

describe('OwnedGraphSurface2d performance presentation', () => {
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

  it('shows actual rendered FPS separately from CPU frame cost while tracking remains always on', async () => {
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
    rendererHarness.render
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3);
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
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
    act(() => frames.shift()?.(40));

    const output = await screen.findByTestId('graph-fps');
    expect(output).toHaveTextContent('— FPS · — ms');
    const options = rendererHarness.create.mock.calls[0][1] as {
      onDeviceLost(message: string): void;
      onFrameComplete(submissionId: number): void;
      onFrameRejected(submissionId: number): void;
    };
    act(() => {
      options.onFrameRejected(1);
      options.onFrameComplete(2);
      options.onFrameComplete(3);
    });
    expect(output).toHaveTextContent(/^\d+ FPS · \d+\.\d{2} ms$/);
    expect(output).not.toHaveTextContent('max');
    expect(output).not.toHaveTextContent('1% high');
    expect(output).not.toHaveTextContent('Sim');
    expect(output).not.toHaveTextContent('Render');
    expect(output).toHaveClass('right-2', 'top-10', 'whitespace-nowrap');
    expect(output).not.toHaveClass('bottom-2', 'left-2');
    expect(output).toHaveAttribute('data-performance-status', 'active');
    expect(Number(output.dataset.renderedFps)).toBe(50);
    expect(output.dataset.potentialFps).toBeUndefined();
    expect(Number(output.dataset.sampleCount)).toBe(2);
    expect(Number(output.dataset.frameAverageMs)).toBeGreaterThanOrEqual(0);
    expect(props.fg2dRef.current?.getFps()).toBe(50);

    rendered.rerender(<OwnedGraphSurface2d {...props} />);
    expect(screen.getByTestId('graph-fps')).toHaveTextContent(/^\d+ FPS · \d+\.\d{2} ms$/);
    const styleVersions = rendererHarness.render.mock.calls.map(
      ([frame]) => (frame as { styleVersion: number }).styleVersion,
    );
    expect(new Set(styleVersions).size).toBe(1);

    rendered.rerender(<OwnedGraphSurface2d {...props} showFps={false} />);
    expect(screen.queryByTestId('graph-fps')).not.toBeInTheDocument();
    expect(props.fg2dRef.current?.getFps()).toBeGreaterThan(0);

    rendered.rerender(<OwnedGraphSurface2d {...props} />);
    expect(screen.getByTestId('graph-fps')).toHaveTextContent(/^\d+ FPS · \d+\.\d{2} ms$/);

    await act(async () => {
      options.onDeviceLost('GPU reset');
      await Promise.resolve();
    });
    expect(screen.getByTestId('graph-fps')).toBeVisible();
    expect(screen.getByTestId('graph-fps')).toHaveTextContent(
      '— FPS · — ms',
    );
    expect(screen.getByTestId('graph-fps')).not.toHaveTextContent('Idle');
    expect(screen.getByTestId('graph-fps')).toHaveAttribute('data-performance-status', 'idle');
    expect(props.fg2dRef.current?.getFps()).toBeNull();
  });

  it('does not count a frame when WebGPU rejects its submission synchronously', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.mocked(requestAnimationFrame).mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render.mockImplementation(() => {
        throw new Error('submission rejected');
      }),
      setSecondarySurface: rendererHarness.setSecondarySurface,
    });
    const props = createDefaultSurfaceProps();
    props.showFps = true;
    props.sharedProps.graphData = { links: [], nodes: [{
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'rejected-frame-node',
      isFavorite: false,
      isPinned: false,
      label: 'rejected-frame-node',
      size: 8,
    }] } as never;
    const rendered = render(<OwnedGraphSurface2d {...props} />);
    const overlay = rendered.container.querySelectorAll('canvas')[1];
    Object.defineProperty(overlay, 'getContext', {
      value: () => ({
        clearRect: vi.fn(), restore: vi.fn(), save: vi.fn(), scale: vi.fn(),
        setTransform: vi.fn(), translate: vi.fn(),
      }),
    });
    await waitFor(() => {
      expect(rendered.container.firstElementChild).toHaveAttribute(
        'data-codegraphy-renderer',
        'webgpu',
      );
    });

    act(() => frames.shift()?.(0));

    expect(screen.getByTestId('graph-fps')).toHaveTextContent('— FPS · — ms');
    expect(screen.getByTestId('graph-fps')).toHaveAttribute('data-performance-status', 'idle');
    expect(props.fg2dRef.current?.getFps()).toBeNull();
  });
});
