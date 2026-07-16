import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGraphLink,
  createGraphNode,
  createSharedProps,
  createSurface2dProps,
  renderViewport,
  resetViewHarness,
} from './viewFixture';

describe('Viewport accessibility and plugin slots', () => {
  beforeEach(resetViewHarness);

  it('opens the graph node context menu from the accessible node item', () => {
    const handleNodeContextMenu = vi.fn();
    const node = createGraphNode('src/app.ts');
    const sharedProps = createSharedProps();
    sharedProps.graphData = { nodes: [node], links: [] };

    renderViewport({
      accessibilityItems: {
        nodes: [{
          kind: 'node',
          id: 'src/app.ts',
          label: 'Graph node src/app.ts',
          radius: 24,
          x: 50,
          y: 60,
        }],
        edges: [],
      },
      handleNodeContextMenu,
      surface2dProps: createSurface2dProps(sharedProps),
    });

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Graph node src/app.ts' }));
    expect(handleNodeContextMenu).toHaveBeenCalledWith('src/app.ts', expect.any(MouseEvent));
  });

  it('opens the graph edge context menu from the accessible edge item', () => {
    const handleEdgeContextMenu = vi.fn();
    const edge = createGraphLink('edge-src-app-src-types', 'src/app.ts', 'src/types.ts');
    const sharedProps = createSharedProps();
    sharedProps.graphData = {
      nodes: [createGraphNode('src/app.ts'), createGraphNode('src/types.ts')],
      links: [edge],
    };

    renderViewport({
      accessibilityItems: {
        nodes: [],
        edges: [{
          kind: 'edge',
          id: 'edge-src-app-src-types',
          label: 'Graph edge src/app.ts to src/types.ts',
        }],
      },
      handleEdgeContextMenu,
      surface2dProps: createSurface2dProps(sharedProps),
    });

    fireEvent.contextMenu(screen.getByLabelText('Graph edge src/app.ts to src/types.ts'));
    expect(handleEdgeContextMenu).toHaveBeenCalledWith(edge, expect.any(MouseEvent));
  });

  it('hosts Graph View stage slots separately for background, world, and viewport overlays', () => {
    const pluginHost = {
      attachSlotHost: vi.fn(),
      detachSlotHost: vi.fn(),
    };

    renderViewport({ pluginHost: pluginHost as never });

    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.stage.worldBackground',
      expect.any(HTMLDivElement),
    );
    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.stage.worldOverlay',
      expect.any(HTMLDivElement),
    );
    expect(pluginHost.attachSlotHost).toHaveBeenCalledWith(
      'graph.stage.viewportOverlay',
      expect.any(HTMLDivElement),
    );
  });
});
