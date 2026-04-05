import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/types';
import Graph from '../../src/webview/components/Graph';
import { graphStore } from '../../src/webview/store/state';

const harness = vi.hoisted(() => ({
	buildGraphContextMenuEntries: vi.fn(() => []),
	buildSharedGraphProps: vi.fn((options: Record<string, unknown>) => ({
		graphData: options.graphData,
		dagMode: options.dagMode,
		dagLevelDistance: options.dagMode ? 180 : undefined,
		d3VelocityDecay: options.damping,
		width: 480,
		height: 320,
		cooldownTicks: 20,
		warmupTicks: 0,
		nodeId: 'id',
		onBackgroundClick: options.onBackgroundClick,
		onBackgroundRightClick: options.onBackgroundRightClick,
		onEngineStop: options.onEngineStop,
		onLinkClick: options.onLinkClick,
		onLinkRightClick: options.onLinkRightClick,
		onNodeClick: options.onNodeClick,
		onNodeHover: options.onNodeHover,
		onNodeRightClick: options.onNodeRightClick,
	})),
	useGraphState: vi.fn(),
	useGraphInteractionRuntime: vi.fn(),
	useGraphCallbacks: vi.fn(),
	useGraphRenderingRuntime: vi.fn(),
	useGraphEventEffects: vi.fn(),
		viewport: vi.fn((_props: Record<string, unknown>) => <div data-testid="graph-viewport" />),
}));

vi.mock('../../src/webview/components/graph/contextMenu/buildEntries', () => ({
	buildGraphContextMenuEntries: harness.buildGraphContextMenuEntries,
}));

vi.mock('../../src/webview/components/graph/rendering/surface/sharedProps', () => ({
	buildSharedGraphProps: harness.buildSharedGraphProps,
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

vi.mock('../../src/webview/components/graph/runtime/use/graph/rendering', () => ({
	useGraphRenderingRuntime: harness.useGraphRenderingRuntime,
}));

vi.mock('../../src/webview/components/graph/runtime/use/graph/events', () => ({
	useGraphEventEffects: harness.useGraphEventEffects,
}));

vi.mock('../../src/webview/components/graph/Viewport', () => ({
	Viewport: (props: Record<string, unknown>) => {
		harness.viewport(props);
		return <div data-testid="graph-viewport" />;
	},
}));

const baseData: IGraphData = {
	nodes: [
		{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
		{ id: 'src/lib.ts', label: 'lib.ts', color: '#67E8F9' },
	],
	edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts' , kind: 'import', sources: [] }],
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
		fg3dRef: { current: undefined },
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

function createRenderingRuntime() {
	return {
		containerSize: { width: 480, height: 320 },
		renderPluginOverlays: vi.fn(),
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
		harness.useGraphRenderingRuntime.mockReturnValue(createRenderingRuntime());
	});

	afterEach(() => {
		setStoreState();
	});

	it('passes store-backed runtime settings through the graph hooks and viewport in light theme', () => {
		const favorites = new Set(['src/app.ts']);
		setStoreState({
			bidirectionalMode: 'line',
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

		expect(harness.useGraphState).toHaveBeenCalledWith(
			expect.objectContaining({
				bidirectionalMode: 'line',
				directionColor: '#ef4444',
				favorites,
				nodeSizeMode: 'file-size',
				showLabels: false,
				theme: 'light',
				timelineActive: true,
			}),
		);
		expect(harness.useGraphRenderingRuntime).toHaveBeenCalledWith(
			expect.objectContaining({
				directionMode: 'particles',
				favorites,
				graphMode: '3d',
				nodeSizeMode: 'file-size',
				particleSize: 7,
				particleSpeed: 0.35,
				showLabels: false,
				theme: 'light',
			}),
		);
		expect(harness.viewport).toHaveBeenCalledWith(
			expect.objectContaining({
				backgroundColor: '#f5f5f5',
				borderColor: '#d4d4d4',
				directionMode: 'particles',
				graphMode: '3d',
				surface2dProps: expect.objectContaining({ particleSize: 7, particleSpeed: 0.35 }),
				surface3dProps: expect.objectContaining({ particleSize: 7, particleSpeed: 0.35 }),
			}),
		);
	});

	it('defaults to dark viewport colors when no theme prop is provided', () => {
		render(<Graph data={baseData} />);

		expect(harness.useGraphState).toHaveBeenCalledWith(
			expect.objectContaining({
				theme: 'dark',
			}),
		);
		expect(harness.useGraphRenderingRuntime).toHaveBeenCalledWith(
			expect.objectContaining({
				theme: 'dark',
			}),
		);
		expect(harness.viewport).toHaveBeenCalledWith(
			expect.objectContaining({
				backgroundColor: '#18181b',
				borderColor: 'rgb(63, 63, 70)',
			}),
		);
	});

	it('rebuilds shared graph props when data and layout settings change', () => {
		const { rerender } = render(<Graph data={baseData} />);
		expect(harness.buildSharedGraphProps).toHaveBeenCalledWith(
			expect.objectContaining({
				dagMode: null,
				damping: 0.7,
				graphData: expect.objectContaining({ nodes: expect.any(Array), links: expect.any(Array) }),
				timelineActive: false,
			}),
		);

		const nextData: IGraphData = {
			nodes: [{ id: 'src/next.ts', label: 'next.ts', color: '#f59e0b' }],
			edges: [],
		};
		setStoreState({
			dagMode: 'td',
			physicsSettings: {
				repelForce: 50,
				centerForce: 0.1,
				linkDistance: 50,
				linkForce: 0.2,
				damping: 0.42,
			},
			timelineActive: true,
		});

		rerender(<Graph data={nextData} theme="light" />);

		expect(harness.buildSharedGraphProps).toHaveBeenLastCalledWith(
			expect.objectContaining({
				dagMode: 'td',
				damping: 0.42,
				graphData: {
					nodes: [{ id: 'src/next.ts', label: 'next.ts', color: '#f59e0b' }],
					links: [],
				},
				timelineActive: true,
			}),
		);
		expect(harness.viewport).toHaveBeenLastCalledWith(
			expect.objectContaining({
				backgroundColor: '#f5f5f5',
				borderColor: '#d4d4d4',
				surface2dProps: expect.objectContaining({
					sharedProps: expect.objectContaining({
						d3VelocityDecay: 0.42,
						dagMode: 'td',
						graphData: {
							nodes: [{ id: 'src/next.ts', label: 'next.ts', color: '#f59e0b' }],
							links: [],
						},
					}),
				}),
			}),
		);
	});
});
