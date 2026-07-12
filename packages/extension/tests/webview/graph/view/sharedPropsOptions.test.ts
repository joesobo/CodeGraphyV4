import { describe, expect, it, vi } from 'vitest';
import { buildGraphSharedPropsOptions } from '../../../../src/webview/components/graph/view/sharedPropsOptions';

describe('graph/sharedPropsOptions', () => {
  it('builds the shared graph props input from interaction handlers', () => {
    const handleEngineStop = vi.fn();
    const interactions = {
      handleBackgroundRightClick: vi.fn(),
      handleLinkRightClick: vi.fn(),
		handleNodeHover: vi.fn(),
		handleNodeDragEnd: vi.fn(),
		handleNodeRightClick: vi.fn(),
      interactionHandlers: {
        handleBackgroundClick: vi.fn(),
        handleLinkClick: vi.fn(),
        handleNodeClick: vi.fn(),
      },
    };

    expect(
      buildGraphSharedPropsOptions({
        containerSize: { width: 640, height: 360 },
        dagMode: 'td',
        damping: 0.42,
        graphData: { links: [] as never, nodes: [] as never },
        handleEngineStop,
        interactions: interactions as never,
      }),
    ).toEqual({
      containerSize: { width: 640, height: 360 },
      dagMode: 'td',
      damping: 0.42,
      graphData: { links: [], nodes: [] },
      onBackgroundClick: interactions.interactionHandlers.handleBackgroundClick,
      onBackgroundRightClick: interactions.handleBackgroundRightClick,
      onEngineStop: handleEngineStop,
      onLinkClick: interactions.interactionHandlers.handleLinkClick,
      onLinkRightClick: interactions.handleLinkRightClick,
			onNodeClick: interactions.interactionHandlers.handleNodeClick,
			onNodeDragEnd: interactions.handleNodeDragEnd,
			onNodeHover: interactions.handleNodeHover,
      onNodeRightClick: interactions.handleNodeRightClick,
    });
  });
});
