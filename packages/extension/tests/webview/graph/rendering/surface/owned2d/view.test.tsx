import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('OwnedGraphSurface2d renderer lifecycle', () => {
  beforeEach(() => {
    rendererHarness.create.mockReset();
    rendererHarness.dispose.mockReset();
    rendererHarness.render.mockReset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
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

  it('shows an explicit error instead of switching to a Canvas graph renderer', async () => {
    rendererHarness.create.mockResolvedValue(undefined);
    const { container } = render(<OwnedGraphSurface2d {...createDefaultSurfaceProps()} />);

    expect(await screen.findByTestId('graph-webgpu-error')).toHaveTextContent(
      'WebGPU is unavailable in this environment.',
    );
    expect(container.firstElementChild).toHaveAttribute('data-codegraphy-renderer', 'error');
    expect(container.querySelector('[data-codegraphy-renderer="canvas2d"]')).not.toBeInTheDocument();
  });
});
