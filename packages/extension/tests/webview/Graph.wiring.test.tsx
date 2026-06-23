import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import Graph from '../../src/webview/components/graph/view/component';
import type { GraphRuntime } from '../../src/webview/components/graph/runtime/use/state';
import { graphStore } from '../../src/webview/store/state';

const harness = vi.hoisted(() => ({
	buildGraphDebugOptions: vi.fn((options: Record<string, unknown>) => options),
	graphViewportShell: vi.fn((_props: Record<string, unknown>) => <div data-testid="graph-viewport-shell" />),
	useGraphAppearance: vi.fn(),
	useGraphCallbacks: vi.fn(),
	useGraphDebugApi: vi.fn(),
	useGraphInteractionRuntime: vi.fn(),
	useGraphRuntime: vi.fn(),
}));

vi.mock('../../src/webview/components/graph/viewport/shell', () => ({
	GraphViewportShell: harness.graphViewportShell,
}));

vi.mock('../../src/webview/components/graph/debug/api', () => ({
	useGraphDebugApi: harness.useGraphDebugApi,
}));

vi.mock('../../src/webview/components/graph/debug/options', () => ({
	buildGraphDebugOptions: harness.buildGraphDebugOptions,
}));

vi.mock('../../src/webview/components/graph/runtime/use/state', () => ({
	useGraphRuntime: harness.useGraphRuntime,
}));

vi.mock('../../src/webview/components/graph/runtime/use/interaction', () => ({
	useGraphInteractionRuntime: harness.useGraphInteractionRuntime,
}));

vi.mock('../../src/webview/components/graph/rendering/useGraphCallbacks', () => ({
	useGraphCallbacks: harness.useGraphCallbacks,
}));

vi.mock('../../src/webview/components/graph/appearance/use', () => ({
	useGraphAppearance: harness.useGraphAppearance,
}));

const baseData: IGraphData = {
	nodes: [
		{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' },
		{ id: 'src/lib.ts', label: 'lib.ts', color: '#67E8F9' },
	],
	edges: [{ id: 'src/app.ts->src/lib.ts', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] }],
};

function createGraphState(graphData: IGraphData = baseData) {
	const containerRef = { current: null };
	const fg2dRef = { current: undefined };
	const fg3dRef = { current: undefined } as GraphRuntime['renderer']['fg3dRef'];
	const graphDataRuntime = {
		nodes: graphData.nodes.map(node => ({ ...node })),
		links: graphData.edges.map(edge => ({ ...edge })),
	};
	const graphDataRef = {
		current: {
			nodes: graphData.nodes.map(node => ({ ...node })),
			links: graphData.edges.map(edge => ({ ...edge })),
		},
	};
	const fileInfoCacheRef = { current: new Map() };
	const lastContainerContextMenuEventRef = { current: 0 };
	const lastGraphContextEventRef = { current: 0 };
	const meshesRef = { current: new Map() };
	const rightClickFallbackTimerRef = { current: null };
	const rightMouseDownRef = { current: null };
	const selectedNodesSetRef = { current: new Set() };
	const setContextSelection = vi.fn();
	const setSelectedNodes = vi.fn();
	const spritesRef = { current: new Map() };
	const triggerImageRerender = vi.fn();

	return {
		context: {
			selection: { kind: 'background', targets: [] },
			setSelection: setContextSelection,
			lastContainerContextMenuEventRef,
			lastGraphContextEventRef,
			rightClickFallbackTimerRef,
			rightMouseDownRef,
		},
		dataRef: { current: graphData },
		directionColorRef: { current: '#22c55e' },
		directionModeRef: { current: 'arrows' },
		edgeDecorationsRef: { current: {} },
		graphCursorRef: { current: 'default' },
		graphAppearanceRef: { current: {} },
		highlightVersion: 0,
		highlightedNeighborsRef: { current: new Set() },
		highlightedNodeRef: { current: null },
		lastClickRef: { current: 0 },
		nodeDecorationsRef: { current: {} },
		renderer: {
			containerRef,
			fg2dRef,
			fg3dRef,
			graphData: graphDataRuntime,
			graphDataRef,
		},
		renderCaches: {
			fileInfoCacheRef,
			imageCacheVersion: 0,
			invalidateImages: triggerImageRerender,
			meshesRef,
			spritesRef,
		},
		selection: {
			selectedNodeIds: [],
			selectedNodeIdsRef: selectedNodesSetRef,
			setSelectedNodeIds: setSelectedNodes,
		},
		setHighlightVersion: vi.fn(),
		showLabelsRef: { current: true },
		themeRef: { current: 'dark' },
		timelineActiveRef: { current: false },
	} as unknown as GraphRuntime;
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
		harness.useGraphAppearance.mockReturnValue({
			focusBorder: '#0ea5e9',
			labelForeground: '#f8fafc',
			labelMutedForeground: '#94a3b8',
			linkHighlight: '#38bdf8',
			linkMuted: '#64748b',
			meshDimmed: '#475569',
			meshSelected: '#e2e8f0',
			nodeSelectionBorder: '#0ea5e9',
			stageBackground: 'var(--cg-popover-translucent)',
			stageBorder: 'transparent',
			transparent: 'transparent',
		});
		harness.useGraphRuntime.mockImplementation(({ data }: { data: IGraphData }) => createGraphState(data));
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

		expect(harness.useGraphRuntime).toHaveBeenCalledWith(expect.objectContaining({
			bidirectionalMode: 'line',
			directionColor: '#38bdf8',
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
				nodeCanvasObject: expect.any(Function),
			}),
			graphDataLayoutKey: expect.any(String),
			graphState: expect.objectContaining({
				renderer: expect.objectContaining({
					graphData: expect.objectContaining({ nodes: expect.any(Array), links: expect.any(Array) }),
				}),
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

	it('uses graph-view contributions registered by the webview plugin host', () => {
		const graphViewContributions = {
			runtimeNodes: [
				{
					pluginId: 'acme.plugin',
					contribution: {
						id: 'acme.plugin.runtime-node',
						label: 'Runtime Node',
						createNodes: () => [],
					},
				},
			],
			runtimeEdges: [],
			projections: [],
			forces: [],
			nodeDragEnd: [],
			contextMenu: [],
			ui: [],
		};
		const disposable = { dispose: vi.fn() };
		const pluginHost = {
			getGraphViewContributions: vi.fn(() => graphViewContributions),
			subscribeGraphViewContributions: vi.fn(() => disposable),
		};

		render(<Graph data={baseData} pluginHost={pluginHost as never} />);

		expect(pluginHost.subscribeGraphViewContributions).toHaveBeenCalledWith(expect.any(Function));
		expect(harness.useGraphRuntime).toHaveBeenCalledWith(expect.objectContaining({
			graphViewContributions,
		}));
		expect(harness.graphViewportShell.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
			graphViewContributions,
		}));
	});

	it('does not auto-fit after switching into 3d mode when the graph ref is ready', () => {
		vi.useFakeTimers();
		const graphState = createGraphState();
		graphState.renderer.fg3dRef.current = {
			d3Force: vi.fn().mockReturnValue({}),
			getGraphBbox: vi.fn().mockReturnValue({ x: [0, 1], y: [0, 1], z: [0, 1] }),
			zoomToFit: vi.fn(),
		} as unknown as NonNullable<GraphRuntime['renderer']['fg3dRef']['current']>;
		const interactionRuntime = createInteractionRuntime();
		setStoreState({ graphMode: '3d' });
		harness.useGraphRuntime.mockReturnValue(graphState);
		harness.useGraphInteractionRuntime.mockReturnValue(interactionRuntime);

		render(<Graph data={baseData} />);
		expect(interactionRuntime.interactionHandlers.fitView).not.toHaveBeenCalled();

		act(() => {
			vi.runAllTimers();
		});

		expect(interactionRuntime.interactionHandlers.fitView).not.toHaveBeenCalled();
	});
});
