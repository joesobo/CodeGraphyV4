import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/types';
import Graph from '../../src/webview/components/Graph';
import { graphStore } from '../../src/webview/store/state';

const harness = vi.hoisted(() => ({
	buildGraphDebugOptions: vi.fn((options: Record<string, unknown>) => options),
	graphViewportShell: vi.fn((_props: Record<string, unknown>) => <div data-testid="graph-viewport-shell" />),
	useGraphCallbacks: vi.fn(),
	useGraphDebugApi: vi.fn(),
	useGraphInteractionRuntime: vi.fn(),
	useGraphState: vi.fn(),
}));

vi.mock('../../src/webview/components/graph/viewport/shell', () => ({
	GraphViewportShell: harness.graphViewportShell,
}));

vi.mock('../../src/webview/components/graph/useDebugApi', () => ({
	useGraphDebugApi: harness.useGraphDebugApi,
}));

vi.mock('../../src/webview/components/graph/debugOptions', () => ({
	buildGraphDebugOptions: harness.buildGraphDebugOptions,
}));

vi.mock('../../src/webview/components/graph/runtime/use/graph/state', () => ({
	useGraphState: harness.useGraphState,
}));

vi.mock('../../src/webview/components/graph/runtime/use/graph/interaction', () => ({
	useGraphInteractionRuntime: harness.useGraphInteractionRuntime,
}));

vi.mock('../../src/webview/components/graph/rendering/useGraphCallbacks', () => ({
	useGraphCallbacks: harness.useGraphCallbacks,
}));

const baseData: IGraphData = {
	nodes: [
		{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
		{ id: 'src/lib.ts', label: 'lib.ts', color: '#67E8F9' },
	],
	edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] }],
};

function createGraphState(graphData: IGraphData = baseData) {
	return {
		containerRef: { current: null },
		contextSelection: { kind: 'background', targets: [] },
		dataRef: { current: graphData },
		directionColorRef: { current: '#22c55e' },
		directionModeRef: { current: 'arrows' },
		edgeDecorationsRef: { current: {} },
		fg2dRef: { current: undefined },
		fg3dRef: { current: undefined as { zoomToFit?: ReturnType<typeof vi.fn> } | undefined },
		fileInfoCacheRef: { current: new Map() },
		graphContextSelection: { kind: 'background', targets: [] },
		graphCursorRef: { current: 'default' },
		graphData: {
			nodes: graphData.nodes.map(node => ({ ...node })),
			links: graphData.edges.map(edge => ({ ...edge })),
		},
		graphDataRef: {
			current: {
				nodes: graphData.nodes.map(node => ({ ...node })),
				links: graphData.edges.map(edge => ({ ...edge })),
			},
		},
		highlightVersion: 0,
		highlightedNeighborsRef: { current: new Set() },
		highlightedNodeRef: { current: null },
		lastClickRef: { current: 0 },
		lastContainerContextMenuEventRef: { current: 0 },
		lastGraphContextEventRef: { current: 0 },
		meshesRef: { current: new Map() },
		nodeDecorationsRef: { current: {} },
		rightClickFallbackTimerRef: { current: null },
		rightMouseDownRef: { current: null },
		selectedNodes: [],
		selectedNodesSetRef: { current: new Set() },
		setContextSelection: vi.fn(),
		setHighlightVersion: vi.fn(),
		setSelectedNodes: vi.fn(),
		showLabelsRef: { current: true },
		spritesRef: { current: new Map() },
		themeRef: { current: 'dark' },
		triggerImageRerender: vi.fn(),
	};
}

function createInteractionRuntime() {
	return {
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
		interactionHandlers: {
			fitView: vi.fn(),
			handleBackgroundClick: vi.fn(),
			handleLinkClick: vi.fn(),
			handleNodeClick: vi.fn(),
		},
		setTooltipData: vi.fn(),
		tooltipData: {
			visible: false,
			nodeRect: { x: 0, y: 0, radius: 0 },
			path: '',
			info: null,
			pluginActions: [],
			pluginSections: [],
		},
	};
}

function createCallbacks() {
	return {
		getArrowColor: vi.fn(),
		getArrowRelPos: vi.fn(),
		getLinkColor: vi.fn(),
		getLinkParticles: vi.fn(),
		getLinkWidth: vi.fn(),
		getParticleColor: vi.fn(),
		linkCanvasObject: vi.fn(),
		nodeCanvasObject: vi.fn(),
		nodePointerAreaPaint: vi.fn(),
		nodeThreeObject: vi.fn(),
	};
}

function resetStore(overrides: Record<string, unknown> = {}) {
	graphStore.setState({
		bidirectionalMode: 'separate',
		dagMode: null,
		directionColor: '#22c55e',
		directionMode: 'arrows',
		favorites: new Set<string>(),
		graphMode: '2d',
		nodeSizeMode: 'connections',
		particleSize: 2,
		particleSpeed: 0.1,
		physicsPaused: false,
		physicsSettings: {
			repelForce: 50,
			centerForce: 0.1,
			linkDistance: 50,
			linkForce: 0.2,
			damping: 0.7,
		},
		pluginContextMenuItems: [],
		showLabels: true,
		timelineActive: false,
		...overrides,
	});
}

function setStoreState(overrides: Record<string, unknown> = {}) {
	act(() => {
		resetStore(overrides);
	});
}

describe('Graph wiring', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setStoreState();
		harness.useGraphState.mockImplementation(({ data }: { data: IGraphData }) => createGraphState(data));
		harness.useGraphInteractionRuntime.mockReturnValue(createInteractionRuntime());
		harness.useGraphCallbacks.mockReturnValue(createCallbacks());
	});

	afterEach(() => {
		vi.useRealTimers();
		setStoreState();
	});

	it('passes store-backed runtime settings into the graph state, interaction runtime, and viewport shell', () => {
		const favorites = new Set(['src/app.ts']);
		setStoreState({
			bidirectionalMode: 'line',
			depthMode: true,
			directionColor: '#ef4444',
			directionMode: 'particles',
			favorites,
			graphMode: '3d',
			nodeSizeMode: 'file-size',
			particleSize: 7,
			particleSpeed: 0.35,
			showLabels: false,
			timelineActive: true,
		});

		render(<Graph data={baseData} theme="light" />);

		expect(harness.useGraphState).toHaveBeenCalledWith(expect.objectContaining({
			bidirectionalMode: 'line',
			directionColor: '#ef4444',
			favorites,
			nodeSizeMode: 'file-size',
			showLabels: false,
			theme: 'light',
			timelineActive: true,
		}));
		expect(harness.useGraphInteractionRuntime).toHaveBeenCalledWith(expect.objectContaining({
			depthMode: true,
			graphMode: '3d',
			isMacPlatform: expect.any(Boolean),
		}));
		expect(harness.graphViewportShell.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
			callbacks: expect.objectContaining({
				getArrowColor: expect.any(Function),
				getLinkColor: expect.any(Function),
				nodeThreeObject: expect.any(Function),
			}),
			graphLayoutKey: expect.any(String),
			graphState: expect.objectContaining({
				graphData: expect.objectContaining({ nodes: expect.any(Array), links: expect.any(Array) }),
			}),
			interactions: expect.objectContaining({
				handleMenuAction: expect.any(Function),
				tooltipData: expect.objectContaining({ path: '' }),
			}),
			pluginHost: undefined,
			theme: 'light',
			viewState: expect.objectContaining({
				graphMode: '3d',
				nodeSizeMode: 'file-size',
				particleSize: 7,
				particleSpeed: 0.35,
				showLabels: false,
				timelineActive: true,
				}),
			}));
	});

	it('defaults the viewport shell theme to dark when no theme prop is provided', () => {
		render(<Graph data={baseData} />);

		expect(harness.graphViewportShell.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
			theme: 'dark',
		}));
	});

	it('auto-fits after switching into 3d mode when the graph ref is ready', () => {
		vi.useFakeTimers();
		const graphState = createGraphState();
		graphState.fg3dRef.current = { zoomToFit: vi.fn() };
		const interactionRuntime = createInteractionRuntime();
		setStoreState({ graphMode: '3d' });
		harness.useGraphState.mockReturnValue(graphState);
		harness.useGraphInteractionRuntime.mockReturnValue(interactionRuntime);

		render(<Graph data={baseData} />);
		expect(interactionRuntime.interactionHandlers.fitView).not.toHaveBeenCalled();

		act(() => {
			vi.runAllTimers();
		});

		expect(interactionRuntime.interactionHandlers.fitView).toHaveBeenCalledOnce();
	});
});
