import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

const surfaceHarness = vi.hoisted(() => ({ renders: vi.fn() }));

vi.mock('../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/render', () => ({
  OwnedGraphSurface2d: () => {
    surfaceHarness.renders();
    requestAnimationFrame(() => undefined);
    return <div data-testid="owned-graph-surface" />;
  },
}));

import {
  createInteractions,
  renderActualViewport,
  renderGraphViewportShell,
  resetShellHarness,
} from './shellFixture';

describe('GraphViewportShell tooltip surface boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    resetShellHarness();
    renderActualViewport();
    surfaceHarness.renders.mockReset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  });

  it('submits zero repeated graph frames for a settled stationary Node tooltip', () => {
    const interactions = createInteractions();
    const rendered = renderGraphViewportShell({ interactions });
    expect(surfaceHarness.renders).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(screen.queryByText('src/app.ts')).not.toBeInTheDocument();

    rendered.rerenderShell({
      interactions: {
        ...interactions,
        tooltipData: {
          info: null,
          nodeRect: { x: 50, y: 60, radius: 12 },
          path: 'src/app.ts',
          pluginActions: [],
          pluginSections: [],
          visible: true,
        },
      },
    });

    expect(screen.getByText('src/app.ts')).toBeVisible();
    expect(surfaceHarness.renders).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    rendered.rerenderShell({
      interactions: {
        ...interactions,
        tooltipData: {
          info: null,
          nodeRect: { x: 50, y: 60, radius: 12 },
          path: 'src/app.ts',
          pluginActions: [],
          pluginSections: [],
          visible: true,
        },
      },
    });

    expect(surfaceHarness.renders).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });
});
