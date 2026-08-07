import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { OwnedGraph2dControls } from '../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/contracts';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import { useGraphTooltip } from '../../../../src/webview/components/graph/runtime/use/tooltip/hook';

const surfaceHarness = vi.hoisted(() => ({
	renderFramePost: undefined as undefined | ((ctx: CanvasRenderingContext2D, globalScale: number) => void),
	renders: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/render', () => ({
  OwnedGraphSurface2d: (props: { onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number): void }) => {
		surfaceHarness.renderFramePost = props.onRenderFramePost;
    surfaceHarness.renders();
    requestAnimationFrame(() => undefined);
    return <div data-testid="owned-graph-surface"><canvas /></div>;
  },
}));

import {
	createCallbacks,
	createGraphData,
	createGraphViewportShellElement,
	createGraphState,
  createInteractions,
	createViewState,
  renderActualViewport,
  resetShellHarness,
} from './shellFixture';

describe('GraphViewportShell tooltip surface boundary', () => {
  afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

  beforeEach(() => {
    resetShellHarness();
    renderActualViewport();
		surfaceHarness.renderFramePost = undefined;
    surfaceHarness.renders.mockReset();
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  });

  it('submits zero repeated graph frames when real tooltip state shows a stationary Node tooltip', () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		const graphState = createGraphState(createGraphData());
		graphState.renderer.fg2dRef.current = {
			graph2ScreenCoords: vi.fn(() => ({ x: 50, y: 60 })),
			zoom: vi.fn(() => 1),
		} as unknown as OwnedGraph2dControls;
		const baseInteractions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = createViewState();
		const handleEngineStop = vi.fn();
		const postMessage = vi.fn();
		const setGraphCursor = vi.fn();
		let handleNodeHover: ((node: FGNode | null) => void) | undefined;

		function TooltipStateHarness() {
			const tooltip = useGraphTooltip({
				containerRef: graphState.renderer.containerRef,
				dataRef: graphState.dataRef,
				fg2dRef: graphState.renderer.fg2dRef,
				fileInfoCacheRef: graphState.renderCaches.fileInfoCacheRef,
				graphViewVisible: true,
				interactionHandlers: { setGraphCursor },
				postMessage,
			});
			handleNodeHover = tooltip.handleNodeHover;
			return createGraphViewportShellElement({
				callbacks,
				graphDataLayoutKey: 'connections::',
				graphState,
				handleEngineStop,
				interactions: { ...baseInteractions, ...tooltip },
				theme: 'light',
				viewState,
			});
		}

		render(<TooltipStateHarness />);
    expect(surfaceHarness.renders).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    expect(screen.queryByText('src/app.ts')).not.toBeInTheDocument();

		act(() => {
			handleNodeHover?.(graphState.renderer.graphData.nodes[0]);
			vi.advanceTimersByTime(500);
		});

    expect(screen.getByText('src/app.ts')).toBeVisible();
    expect(surfaceHarness.renders).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

		act(() => {
			surfaceHarness.renderFramePost?.({} as CanvasRenderingContext2D, 1);
			surfaceHarness.renderFramePost?.({} as CanvasRenderingContext2D, 1);
		});

    expect(surfaceHarness.renders).toHaveBeenCalledOnce();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });
});
