import { fireEvent, render, waitFor } from '@testing-library/react';
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
import { TypedGraphLayoutEngine } from '@codegraphy-dev/graph-renderer/testing';

describe('OwnedGraphSurface2d pointer integration', () => {
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

  it('routes a Ctrl-click on a node to additive selection without starting a node drag', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
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
    fireEvent.contextMenu(overlay, {
      button: 0,
      clientX: 50,
      clientY: 50,
      ctrlKey: true,
    });
    expect(props.sharedProps.onNodeClick).not.toHaveBeenCalled();
    expect(props.sharedProps.onNodeRightClick).not.toHaveBeenCalled();
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
    fireEvent.contextMenu(overlay, {
      button: 0,
      clientX: 50,
      clientY: 50,
      ctrlKey: true,
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
    expect(props.sharedProps.onNodeRightClick).not.toHaveBeenCalled();
  });

  it('opens a right-clicked node menu only after an unmoved release', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
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
      id: 'context-node',
      isFavorite: false,
      isPinned: false,
      label: 'context-node',
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

    fireEvent.pointerDown(overlay, { button: 2, buttons: 2, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.contextMenu(overlay, { button: 2, buttons: 2, clientX: 50, clientY: 50 });
    expect(props.sharedProps.onNodeRightClick).not.toHaveBeenCalled();

    fireEvent.pointerUp(overlay, { button: 2, clientX: 50, clientY: 50, pointerId: 1 });
    expect(props.sharedProps.onNodeRightClick).toHaveBeenCalledOnce();
    expect(props.sharedProps.onNodeRightClick).toHaveBeenCalledWith(node, expect.any(MouseEvent));
  });

  it('pans with a right-button drag without opening a context menu', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
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
    props.sharedProps.graphData = { links: [], nodes: [] } as never;
    const { container } = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    const overlay = container.querySelectorAll('canvas')[1];
    overlay.setPointerCapture = vi.fn();
    overlay.hasPointerCapture = vi.fn(() => true);
    overlay.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(overlay, { button: 2, buttons: 2, clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.contextMenu(overlay, { button: 2, buttons: 2, clientX: 40, clientY: 50 });
    fireEvent.pointerMove(overlay, { button: 2, buttons: 2, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(overlay, { button: 2, clientX: 50, clientY: 50, pointerId: 1 });

    expect(props.sharedProps.onNodeRightClick).not.toHaveBeenCalled();
    expect(props.sharedProps.onLinkRightClick).not.toHaveBeenCalled();
    expect(props.sharedProps.onBackgroundRightClick).not.toHaveBeenCalled();
  });

  it('keeps sub-threshold pointer jitter as a stationary click', async () => {
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: rendererHarness.dispose,
      render: rendererHarness.render,
      setSecondarySurface: rendererHarness.setSecondarySurface,
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

});
