import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import type { GraphViewStoreState } from '../../../../src/webview/components/graph/view/store';
import type { GraphRuntime } from '../../../../src/webview/components/graph/runtime/use/state';
import type { UseGraphInteractionRuntimeResult } from '../../../../src/webview/components/graph/runtime/use/interaction';
import { useGraphViewportModel } from '../../../../src/webview/components/graph/viewport/model';

const harness = vi.hoisted(() => ({
	buildGraphContextMenuEntries: vi.fn(() => [{ id: 'menu', kind: 'action', label: 'Menu', action: { type: 'noop' } }]),
	buildGraphSharedPropsOptions: vi.fn((options: Record<string, unknown>) => options),
	buildSharedGraphProps: vi.fn(() => ({ shared: true })),
	getGraphSurfaceColors: vi.fn(() => ({
		canvasBackgroundColor: 'transparent',
		containerBackgroundColor: 'var(--cg-popover-translucent)',
		borderColor: '#d4d4d4',
	})),
	handleGraphSurface3dError: vi.fn(),
	postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/contextMenu/build/entries', () => ({
	buildGraphContextMenuEntries: harness.buildGraphContextMenuEntries,
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/sharedProps', () => ({
	buildSharedGraphProps: harness.buildSharedGraphProps,
}));

vi.mock('../../../../src/webview/components/graph/view/sharedPropsOptions', () => ({
	buildGraphSharedPropsOptions: harness.buildGraphSharedPropsOptions,
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/error', () => ({
	handleGraphSurface3dError: harness.handleGraphSurface3dError,
}));

vi.mock('../../../../src/webview/components/graph/rendering/surface/colors', () => ({
	getGraphSurfaceColors: harness.getGraphSurfaceColors,
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
	postMessage: harness.postMessage,
}));

function createGraphData(): GraphRuntime['renderer']['graphData'] {
	return {
		nodes: [{
			baseOpacity: 1,
			borderColor: '#1f2937',
			borderWidth: 1,
			color: '#93C5FD',
			id: 'src/app.ts',
			isFavorite: false,
			isPinned: false,
			label: 'app.ts',
			size: 12,
		}],
		links: [],
	};
}

function createInteractions(): UseGraphInteractionRuntimeResult {
	return {
		contextMenuRuntime: {
			clearRightClickFallbackTimer: vi.fn(),
			handleContextMenu: vi.fn(),
			handleMenuAction: vi.fn(),
			handleMouseDownCapture: vi.fn(),
			handleMouseMoveCapture: vi.fn(),
			handleMouseUpCapture: vi.fn(),
		},
		handleBackgroundRightClick: vi.fn(),
		handleContextMenu: vi.fn(),
		handleEngineStop: vi.fn(),
		handleLinkRightClick: vi.fn(),
		handleMenuAction: vi.fn(),
		handleMouseDownCapture: vi.fn(),
		handleMouseLeave: vi.fn(),
		handleMouseMoveCapture: vi.fn(),
		handleMouseUpCapture: vi.fn(),
		handleNodeHover: vi.fn(),
		handleNodeRightClick: vi.fn(),
		hoveredNodeRef: { current: null },
		interactionHandlers: {
			fitView: vi.fn(),
			focusNodeById: vi.fn(),
			handleBackgroundClick: vi.fn(),
			handleLinkClick: vi.fn(),
			handleNodeClick: vi.fn(),
			openBackgroundContextMenu: vi.fn(),
			openEdgeContextMenu: vi.fn(),
			openNodeContextMenu: vi.fn(),
			requestNodeOpenById: vi.fn(),
			sendGraphInteraction: vi.fn(),
			setGraphCursor: vi.fn(),
			setSelection: vi.fn(),
			zoomGraphView: vi.fn(),
		},
		setTooltipData: vi.fn(),
		stopTooltipTracking: vi.fn(),
		tooltipData: {
			visible: false,
			nodeRect: { x: 0, y: 0, radius: 0 },
			path: '',
			info: null,
			pluginActions: [],
			pluginSections: [],
		},
		tooltipTimeoutRef: { current: null },
	} as unknown as UseGraphInteractionRuntimeResult;
}

function createViewState(): Pick<
	GraphViewStoreState,
	| 'currentCommitSha'
	| 'compareSelectedPath'
	| 'dagMode'
	| 'favorites'
	| 'graphMode'
	| 'physicsSettings'
	| 'pluginContextMenuItems'
	| 'setGraphMode'
	| 'timelineActive'
	| 'timelineCommits'
> {
	const physicsSettings: IPhysicsSettings = {
		centerForce: 0.1,
		damping: 0.42,
		linkDistance: 120,
		linkForce: 0.4,
		repelForce: 500,
	};

	return {
		compareSelectedPath: null,
		dagMode: 'td',
		favorites: new Set(['src/app.ts']),
		graphMode: '2d',
		physicsSettings,
		pluginContextMenuItems: [],
		setGraphMode: vi.fn(),
		timelineActive: true,
		timelineCommits: [
			{ sha: 'old', timestamp: 1, message: 'old', author: 'Ada', parents: [] },
			{ sha: 'current', timestamp: 2, message: 'current', author: 'Ada', parents: ['old'] },
		],
		currentCommitSha: 'current',
	};
}

describe('graph/viewport/model', () => {
	beforeEach(() => {
		harness.buildGraphContextMenuEntries.mockClear();
		harness.buildGraphSharedPropsOptions.mockClear();
		harness.buildSharedGraphProps.mockClear();
		harness.getGraphSurfaceColors.mockClear();
		harness.handleGraphSurface3dError.mockClear();
		harness.postMessage.mockClear();
	});

	it('builds shared props, menu entries, colors, and 3d fallback handling from the current graph state', () => {
		const graphData = createGraphData();
		const interactions = createInteractions();
		const handleEngineStop = vi.fn();
		const onEngineTick = vi.fn();
		const viewState = createViewState();

		const { result } = renderHook(() => useGraphViewportModel({
			graphState: {
				contextSelection: { kind: 'background', targets: [] },
				graphData,
			},
			handleEngineStop,
			interactions,
			onEngineTick,
			theme: 'light',
			viewportRuntime: { containerSize: { width: 480, height: 320 } },
			viewState,
		}));

		expect(harness.buildGraphSharedPropsOptions).toHaveBeenCalledWith(expect.objectContaining({
			containerSize: { width: 480, height: 320 },
			dagMode: 'td',
			damping: 0.42,
			graphData,
			handleEngineStop,
			interactions,
			onEngineTick,
			timelineActive: true,
		}));
		expect(harness.buildSharedGraphProps).toHaveBeenCalledWith(expect.objectContaining({
			containerSize: { width: 480, height: 320 },
			dagMode: 'td',
			damping: 0.42,
			graphData,
			handleEngineStop,
			interactions,
			timelineActive: true,
		}));
		expect(harness.buildGraphContextMenuEntries).toHaveBeenCalledWith({
			compareSelectedPath: null,
			edges: graphData.links,
			favorites: viewState.favorites,
			graphMode: '2d',
			graphViewContributions: undefined,
			mutationAvailability: 'enabled',
			nodes: graphData.nodes,
			pluginItems: [],
			selection: { kind: 'background', targets: [] },
			timelineActive: true,
		});
		expect(harness.getGraphSurfaceColors).toHaveBeenCalledWith(undefined);
		expect(result.current.sharedProps).toEqual({ shared: true });
		expect(result.current.canvasBackgroundColor).toBe('transparent');
		expect(result.current.containerBackgroundColor).toBe('var(--cg-popover-translucent)');
		expect(result.current.borderColor).toBe('#d4d4d4');

		result.current.onSurface3dError(new Error('WebGL failed'));

		expect(harness.handleGraphSurface3dError).toHaveBeenCalledWith({
			error: expect.any(Error),
			postGraphMessage: harness.postMessage,
			setGraphMode: viewState.setGraphMode,
		});
	});

	it('recomputes shared props when the graph layout inputs change', () => {
		const graphData = createGraphData();
		const interactions = createInteractions();
		const handleEngineStop = vi.fn();
		const viewState = createViewState();

		const { rerender } = renderHook(({ nextGraphData, nextViewState }) => useGraphViewportModel({
			graphState: {
				contextSelection: { kind: 'background', targets: [] },
				graphData: nextGraphData,
			},
			handleEngineStop,
			interactions,
			theme: 'light',
			viewportRuntime: { containerSize: { width: 480, height: 320 } },
			viewState: nextViewState,
		}), {
			initialProps: {
				nextGraphData: graphData,
				nextViewState: viewState,
			},
		});

		expect(harness.buildSharedGraphProps).toHaveBeenCalledTimes(1);

		const nextViewState = {
			...viewState,
			physicsSettings: {
				...viewState.physicsSettings,
				damping: 0.6,
			},
			timelineActive: false,
		};
		const nextGraphData = {
			nodes: [
				{ id: 'src/next.ts', label: 'next.ts', color: '#f59e0b' } as never,
			],
			links: [],
		} as GraphRuntime['renderer']['graphData'];

		rerender({
			nextGraphData,
			nextViewState,
		});

		expect(harness.buildSharedGraphProps).toHaveBeenCalledTimes(2);
		expect(harness.buildGraphSharedPropsOptions).toHaveBeenLastCalledWith(expect.objectContaining({
			damping: 0.6,
			graphData: nextGraphData,
			timelineActive: false,
		}));
	});

	it('disables mutation menu actions for historical timeline snapshots', () => {
		const graphData = createGraphData();
		const interactions = createInteractions();
		const handleEngineStop = vi.fn();
		const viewState = {
			...createViewState(),
			currentCommitSha: 'old',
		};

		renderHook(() => useGraphViewportModel({
			graphState: {
				contextSelection: { kind: 'background', targets: [] },
				graphData,
			},
			handleEngineStop,
			interactions,
			theme: 'light',
			viewportRuntime: { containerSize: { width: 480, height: 320 } },
			viewState,
		}));

		expect(harness.buildGraphContextMenuEntries).toHaveBeenCalledWith(expect.objectContaining({
			mutationAvailability: 'disabled',
			nodes: graphData.nodes,
		}));
	});
});
