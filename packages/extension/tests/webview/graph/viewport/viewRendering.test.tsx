import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createSurface2dProps,
  getViewHarness,
  renderViewport,
  resetViewHarness,
} from './viewFixture';

const viewHarness = getViewHarness();

describe('Viewport rendering', () => {
  beforeEach(resetViewHarness);

  it('renders the 2d graph surface and forwards tooltip data', () => {
    renderViewport();

    expect(screen.getByTestId('surface-2d')).toBeInTheDocument();
    expect(viewHarness.surface2d).toHaveBeenCalledWith(expect.objectContaining({
      backgroundColor: 'transparent',
      directionMode: 'arrows',
      particleSize: 2,
    }));
    expect(viewHarness.nodeTooltip).toHaveBeenCalledWith(expect.objectContaining({
      path: 'src/App.ts',
      visible: true,
    }));
  });

  it('does not rerender the 2d graph surface when only viewport overlays change', () => {
    const surface2dProps = createSurface2dProps();
    const rendered = renderViewport({
      accessibilityItems: { nodes: [], edges: [] },
      surface2dProps,
      tooltipData: {
        visible: false,
        nodeRect: { x: 0, y: 0, radius: 0 },
        path: '',
        info: null,
        pluginSections: [],
      },
    });

    expect(viewHarness.surface2d).toHaveBeenCalledTimes(1);

    rendered.rerenderViewport({
      accessibilityItems: {
        nodes: [],
        edges: [{ kind: 'edge', id: 'edge-a', label: 'Edge A' }],
      },
      tooltipData: {
        visible: true,
        nodeRect: { x: 1, y: 2, radius: 3 },
        path: 'src/next.ts',
        info: null,
        pluginSections: [],
      },
    });

    expect(viewHarness.surface2d).toHaveBeenCalledTimes(1);
    expect(viewHarness.nodeTooltip).toHaveBeenCalledWith(expect.objectContaining({
      path: 'src/next.ts',
      visible: true,
    }));
  });
});
