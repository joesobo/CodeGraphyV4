import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurfaceProps } from '../surface/fixture';

const rendererHarness = vi.hoisted(() => ({
  create: vi.fn(),
  dispose: vi.fn(),
  render: vi.fn(),
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
import { TypedGraphLayoutEngine } from '@codegraphy-dev/graph-renderer/testing';

describe('OwnedGraphSurface2d physics integration', () => {
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

});
