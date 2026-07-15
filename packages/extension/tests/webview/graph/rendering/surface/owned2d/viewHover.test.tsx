import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSurfaceProps } from './surfaceFixture';

const rendererHarness = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.unmock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/view');
vi.mock('@codegraphy-dev/graph-renderer/webgpu', () => ({
  OwnedWebGpuRenderer: class OwnedWebGpuRenderer {
    static create(...arguments_: unknown[]) {
      return rendererHarness.create(...arguments_);
    }
  },
}));

import { OwnedGraphSurface2d } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/view';

describe('OwnedGraphSurface2d hover presentation', () => {
  beforeEach(() => {
    rendererHarness.create.mockReset();
    rendererHarness.create.mockResolvedValue({
      canRender: () => true,
      dispose: vi.fn(),
      render: vi.fn(),
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('PointerEvent', MouseEvent);
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
  });

  it('clears the edge tooltip when programmatic zoom leaves the hover range', async () => {
    const props = createDefaultSurfaceProps();
    const source = {
      baseOpacity: 1,
      borderColor: '#000',
      borderWidth: 1,
      color: '#fff',
      id: 'source',
      isFavorite: false,
      isPinned: false,
      label: 'Source',
      size: 8,
      x: -20,
      y: 0,
    };
    const target = { ...source, id: 'target', label: 'Target', x: 20 };
    const link = {
      from: source.id,
      id: 'source-target',
      source,
      target,
      to: target.id,
    };
    props.sharedProps.graphData = { links: [link], nodes: [source, target] } as never;
    const { container } = render(<OwnedGraphSurface2d {...props} />);
    await waitFor(() => {
      expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'webgpu');
    });
    act(() => { props.fg2dRef.current?.zoom(1); });

    const overlay = container.querySelectorAll('canvas')[1];
    fireEvent.pointerMove(overlay, { clientX: 50, clientY: 50, pointerId: 1 });
    expect(screen.getByTestId('graph-edge-tooltip')).toHaveTextContent('Source → Target');

    fireEvent.pointerDown(overlay, {
      button: 0,
      clientX: 50,
      clientY: 50,
      pointerId: 1,
    });
    expect(screen.queryByTestId('graph-edge-tooltip')).not.toBeInTheDocument();
    fireEvent.pointerUp(overlay, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(overlay, { clientX: 50, clientY: 50, pointerId: 1 });
    expect(screen.getByTestId('graph-edge-tooltip')).toHaveTextContent('Source → Target');

    act(() => { props.fg2dRef.current?.zoom(0.49); });
    expect(screen.queryByTestId('graph-edge-tooltip')).not.toBeInTheDocument();
  });
});
