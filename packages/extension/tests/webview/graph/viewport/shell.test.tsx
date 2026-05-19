import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import type { GraphViewStoreState } from '../../../../src/webview/components/graph/view/store';
import type { UseGraphInteractionRuntimeResult } from '../../../../src/webview/components/graph/runtime/use/interaction';
import type { UseGraphStateResult } from '../../../../src/webview/components/graph/runtime/use/state';
import { GraphViewportShell } from '../../../../src/webview/components/graph/viewport/shell';

const harness = vi.hoisted(() => ({
	postMessage: vi.fn(),
	useGraphRenderingRuntime: vi.fn(),
	useGraphViewportModel: vi.fn(),
	viewport: vi.fn((_props: Record<string, unknown>) => <div data-testid="graph-viewport" />),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
	postMessage: harness.postMessage,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/rendering', () => ({
	useGraphRenderingRuntime: harness.useGraphRenderingRuntime,
}));

vi.mock('../../../../src/webview/components/graph/viewport/model', () => ({
	useGraphViewportModel: harness.useGraphViewportModel,
}));

vi.mock('../../../../src/webview/components/graph/viewport/view', () => ({
	Viewport: (props: Record<string, unknown>) => {
		harness.viewport(props);
		return <div data-testid="graph-viewport" />;
	},
}));

function createGraphData(): UseGraphStateResult['graphData'] {
	return {
		nodes: [
			{
				baseOpacity: 1,
				borderColor: '#1f2937',
				borderWidth: 1,
				color: '#93C5FD',
				id: 'src/app.ts',
				isFavorite: false,
				isPinned: false,
				label: 'app.ts',
				size: 12,
			},
			{
				baseOpacity: 1,
				borderColor: '#1f2937',
				borderWidth: 1,
				color: '#67E8F9',
				id: 'src/lib.ts',
				isFavorite: false,
				isPinned: false,
				label: 'lib.ts',
				size: 12,
			},
		],
		links: [{
			bidirectional: false,
			id: 'src/app.ts->src/lib.ts',
			from: 'src/app.ts',
			kind: 'import',
			source: 'src/app.ts',
			sourceNode: undefined,
			sources: [],
			target: 'src/lib.ts',
			targetNode: undefined,
			to: 'src/lib.ts',
			visible: true,
		}],
	};
}

function createGraphState(graphData: UseGraphStateResult['graphData']): UseGraphStateResult {
	const dataRefCurrent: IGraphData = {
		nodes: graphData.nodes.map(node => ({ id: node.id, label: node.label, color: node.color })),
		edges: graphData.links.map(link => ({
			from: link.from,
			id: link.id,
			kind: 'import',
			sources: [],
			to: link.to,
		})),
	};

	return {
		containerRef: { current: null },
		contextSelection: { kind: 'background', targets: [] },
		dataRef: { current: dataRefCurrent },
		directionColorRef: { current: '#22c55e' },
		directionModeRef: { current: 'arrows' },
		fileInfoCacheRef: { current: new Map() },
		fg2dRef: { current: undefined },
		fg3dRef: { current: undefined },
		graphData,
		graphDataRef: { current: { links: graphData.links.map(link => ({ ...link })), nodes: graphData.nodes.map(node => ({ ...node })) } },
		graphCursorRef: { current: 'default' },
		highlightVersion: 0,
		highlightedNeighborsRef: { current: new Set() },
		highlightedNodeRef: { current: null },
		lastClickRef: { current: null },
		lastContainerContextMenuEventRef: { current: 0 },
		lastGraphContextEventRef: { current: 0 },
		meshesRef: { current: new Map() },
		rightClickFallbackTimerRef: { current: null },
		rightMouseDownRef: { current: null },
		selectedNodes: [],
		selectedNodesSetRef: { current: new Set() },
		edgeDecorationsRef: { current: {} },
		favoritesRef: { current: new Set() },
		graphContextSelection: { kind: 'background', targets: [] },
		imageCacheVersion: 0,
		nodeDecorationsRef: { current: {} },
		nodeSizeModeRef: { current: 'connections' },
		setContextSelection: vi.fn(),
		setHighlightVersion: vi.fn(),
		setSelectedNodes: vi.fn(),
		timelineActiveRef: { current: true },
		showLabelsRef: { current: true },
		spritesRef: { current: new Map() },
		themeRef: { current: 'dark' },
		triggerImageRerender: vi.fn(),
	} as unknown as UseGraphStateResult;
}

function createInteractions(): UseGraphInteractionRuntimeResult {
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
			zoomGraphView: vi.fn(),
			setSelection: vi.fn(),
			requestNodeOpenById: vi.fn(),
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
		contextMenuRuntime: {} as never,
		hoveredNodeRef: { current: null },
		stopTooltipTracking: vi.fn(),
		tooltipTimeoutRef: { current: null },
	} as unknown as UseGraphInteractionRuntimeResult;
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

function createViewState(): Pick<
	GraphViewStoreState,
	'bidirectionalMode' | 'currentCommitSha' | 'dagMode' | 'depthMode' | 'directionMode' | 'favorites' | 'graphLayout' | 'graphMode' | 'graphSectionsAvailable' | 'graphViewContributionStatuses' | 'nodeSizeMode' | 'particleSize' | 'particleSpeed' | 'physicsPaused' | 'physicsSettings' | 'pluginContextMenuItems' | 'setGraphMode' | 'showLabels' | 'timelineActive' | 'timelineCommits'
> {
	const physicsSettings: IPhysicsSettings = {
		centerForce: 0.1,
		damping: 0.42,
		linkDistance: 120,
		linkForce: 0.4,
		repelForce: 500,
	};

	return {
		bidirectionalMode: 'separate',
		currentCommitSha: 'commit-b',
		dagMode: 'td',
		depthMode: false,
		directionMode: 'arrows',
		favorites: new Set(['src/app.ts']),
		graphLayout: { collapsedNodes: {}, pinnedNodes: {}, sections: {}, ownership: {} },
		graphMode: '3d',
		graphSectionsAvailable: true,
		graphViewContributionStatuses: [],
		nodeSizeMode: 'connections',
		particleSize: 3,
		particleSpeed: 0.2,
		physicsPaused: false,
		physicsSettings,
		pluginContextMenuItems: [],
		setGraphMode: vi.fn(),
		showLabels: true,
		timelineActive: true,
		timelineCommits: [
			{ sha: 'commit-a', message: 'A', author: 'Ada', parents: [], timestamp: 1 },
			{ sha: 'commit-b', message: 'B', author: 'Ada', parents: ['commit-a'], timestamp: 2 },
		],
	};
}

describe('graph/viewport/shell', () => {
	beforeEach(() => {
		harness.postMessage.mockReset();
		harness.useGraphRenderingRuntime.mockReset();
		harness.useGraphViewportModel.mockReset();
		harness.viewport.mockReset();
		harness.useGraphRenderingRuntime.mockReturnValue({
			containerSize: { height: 320, width: 480 },
			renderPluginOverlays: vi.fn(),
		});
		harness.useGraphViewportModel.mockReturnValue({
			canvasBackgroundColor: 'transparent',
			containerBackgroundColor: 'var(--cg-popover-translucent)',
			borderColor: 'rgb(63, 63, 70)',
			menuEntries: [{ id: 'menu', kind: 'action', label: 'Menu', action: { type: 'noop' } }],
			onSurface3dError: vi.fn(),
			sharedProps: {
				cooldownTicks: 500,
				d3AlphaDecay: 0.0228,
				d3VelocityDecay: 0.42,
				dagLevelDistance: 60,
				dagMode: 'td',
				graphData: { nodes: [], links: [] },
				height: 320,
				nodeId: 'id',
				onBackgroundClick: vi.fn(),
				onBackgroundRightClick: vi.fn(),
				onEngineStop: vi.fn(),
				onLinkClick: vi.fn(),
				onLinkRightClick: vi.fn(),
				onNodeClick: vi.fn(),
				onNodeDrag: vi.fn(),
				onNodeDragEnd: vi.fn(),
				onNodeHover: vi.fn(),
				onNodeRightClick: vi.fn(),
				warmupTicks: 0,
				width: 480,
			},
		});
	});

	it('wires rendering runtime, viewport model, and the Viewport component', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const interactions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = createViewState();
		const handleEngineStop = vi.fn();
		const pluginHost = { getOverlays: vi.fn() };

		render(
			<GraphViewportShell
				callbacks={callbacks}
				graphLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={handleEngineStop}
				interactions={interactions}
				pluginHost={pluginHost as never}
				theme="light"
				viewState={viewState}
			/>,
		);

		expect(harness.useGraphRenderingRuntime).toHaveBeenCalledWith(expect.objectContaining({
			containerRef: graphState.containerRef,
			dataRef: graphState.dataRef,
			fg2dRef: graphState.fg2dRef,
			fg3dRef: graphState.fg3dRef,
			getArrowColor: callbacks.getArrowColor,
			getArrowRelPos: callbacks.getArrowRelPos,
			getLinkParticles: callbacks.getLinkParticles,
			getParticleColor: callbacks.getParticleColor,
			graphDataRef: graphState.graphDataRef,
			graphLayout: viewState.graphLayout,
			graphLayoutKey: 'connections::',
			graphMode: '3d',
			meshesRef: graphState.meshesRef,
			nodeSizeMode: 'connections',
			particleSize: 3,
			particleSpeed: 0.2,
			physicsPaused: false,
			physicsSettings: viewState.physicsSettings,
			pluginHost,
			selectedNodesSetRef: graphState.selectedNodesSetRef,
			showLabels: true,
			spritesRef: graphState.spritesRef,
			theme: 'light',
			favorites: viewState.favorites,
			directionMode: 'arrows',
		}));
		expect(harness.useGraphViewportModel).toHaveBeenCalledWith(expect.objectContaining({
			graphState: {
				contextSelection: graphState.contextSelection,
				graphData,
			},
			handleEngineStop,
			interactions,
			viewState,
			viewportRuntime: expect.objectContaining({ containerSize: { height: 320, width: 480 } }),
		}));
		expect(harness.viewport).toHaveBeenCalledWith(expect.objectContaining({
			canvasBackgroundColor: 'transparent',
			containerBackgroundColor: 'var(--cg-popover-translucent)',
			borderColor: 'rgb(63, 63, 70)',
			containerRef: graphState.containerRef,
			directionMode: 'arrows',
			graphMode: '3d',
			handleContextMenu: interactions.handleContextMenu,
			handleMenuAction: interactions.handleMenuAction,
			handleMouseDownCapture: interactions.handleMouseDownCapture,
			handleMouseLeave: interactions.handleMouseLeave,
			handleMouseMoveCapture: interactions.handleMouseMoveCapture,
			handleMouseUpCapture: interactions.handleMouseUpCapture,
			menuEntries: [{ id: 'menu', kind: 'action', label: 'Menu', action: { type: 'noop' } }],
			onSurface3dError: expect.any(Function),
			pluginHost,
			surface2dProps: expect.objectContaining({
				fg2dRef: graphState.fg2dRef,
				getArrowColor: callbacks.getArrowColor,
				getLinkColor: callbacks.getLinkColor,
				getParticleColor: callbacks.getParticleColor,
				onRenderFramePost: expect.any(Function),
				particleSize: 3,
				particleSpeed: 0.2,
				sharedProps: expect.objectContaining({ dagMode: 'td' }),
			}),
			surface3dProps: expect.objectContaining({
				fg3dRef: graphState.fg3dRef,
				getArrowColor: callbacks.getArrowColor,
				getLinkColor: callbacks.getLinkColor,
				getParticleColor: callbacks.getParticleColor,
				nodeThreeObject: callbacks.nodeThreeObject,
				particleSize: 3,
				particleSpeed: 0.2,
				sharedProps: expect.objectContaining({ dagMode: 'td' }),
			}),
			tooltipData: interactions.tooltipData,
		}));
	});

	it('does not render persisted Section Frames without runtime Graph Section nodes', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const viewState = createViewState();
		viewState.graphMode = '2d';
		viewState.timelineActive = false;
		viewState.graphLayout = {
			collapsedNodes: {},
			pinnedNodes: {},
			sections: {
				'section-ui': {
					id: 'section-ui',
					label: 'UI',
					color: '#60a5fa',
					x: 100,
					y: 120,
					width: 300,
					height: 180,
					collapsed: false,
					updatedAt: '2026-05-19T09:00:00.000Z',
				},
			},
			ownership: {},
		};

		render(
			<GraphViewportShell
				callbacks={createCallbacks()}
				graphLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={createInteractions()}
				theme="light"
				viewState={viewState}
			/>,
		);

		expect(harness.viewport).toHaveBeenCalledWith(expect.objectContaining({
			sectionFrames: [],
			sectionNodePositions: new Map(),
		}));
	});

	it('does not pass persisted section layout into physics when Graph Sections are unavailable', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const viewState = createViewState();
		viewState.graphMode = '2d';
		viewState.graphSectionsAvailable = false;
		viewState.graphLayout = {
			collapsedNodes: {},
			pinnedNodes: {},
			sections: {
				'section-ui': {
					id: 'section-ui',
					label: 'UI',
					color: '#60a5fa',
					x: 100,
					y: 120,
					width: 300,
					height: 180,
					collapsed: false,
					updatedAt: '2026-05-19T09:00:00.000Z',
				},
			},
			ownership: {
				'src/app.ts': {
					itemId: 'src/app.ts',
					itemKind: 'node',
					ownerSectionId: 'section-ui',
					updatedAt: '2026-05-19T09:00:00.000Z',
				},
			},
		};

		render(
			<GraphViewportShell
				callbacks={createCallbacks()}
				graphLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={createInteractions()}
				theme="light"
				viewState={viewState}
			/>,
		);

		expect(harness.useGraphRenderingRuntime).toHaveBeenCalledWith(expect.objectContaining({
			graphLayout: undefined,
		}));
	});

	it('passes only expanded runtime-backed Section Frames to the viewport', () => {
		const graphData = createGraphData();
		graphData.nodes = [
			...graphData.nodes,
			{
				baseOpacity: 1,
				borderColor: '#60a5fa',
				borderWidth: 1,
				color: '#60a5fa',
				id: 'section-ui',
				isCollapsedGraphSection: false,
				isFavorite: false,
				isGraphSection: true,
				isPinned: false,
				label: 'UI',
				sectionHeight: 180,
				sectionWidth: 300,
				size: 48,
				x: 250,
				y: 210,
			},
		] as never;
		const graphState = createGraphState(graphData);
		const viewState = createViewState();
		viewState.graphMode = '2d';
		viewState.timelineActive = false;
		viewState.graphLayout = {
			collapsedNodes: {},
			pinnedNodes: {},
			sections: {
				'section-ui': {
					id: 'section-ui',
					label: 'UI',
					color: '#60a5fa',
					x: 100,
					y: 120,
					width: 300,
					height: 180,
					collapsed: false,
					updatedAt: '2026-05-19T09:00:00.000Z',
				},
				'section-stale': {
					id: 'section-stale',
					label: 'Stale',
					color: '#f97316',
					x: -100,
					y: -120,
					width: 200,
					height: 140,
					collapsed: false,
					updatedAt: '2026-05-19T09:00:00.000Z',
				},
			},
			ownership: {},
		};

		render(
			<GraphViewportShell
				callbacks={createCallbacks()}
				graphLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={createInteractions()}
				theme="light"
				viewState={viewState}
			/>,
		);

		const viewportProps = harness.viewport.mock.calls[0]?.[0] as {
			sectionFrames: Array<{ id: string }>;
			sectionNodePositions: Map<string, unknown>;
		};

		expect(viewportProps.sectionFrames.map(section => section.id)).toEqual(['section-ui']);
		expect([...viewportProps.sectionNodePositions.keys()]).toEqual(['section-ui']);
	});

	it('posts section ownership updates after an expanded Section Frame is dragged into another section', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		graphState.graphDataRef.current.nodes = [
			{
				id: 'section-1',
				isGraphSection: true,
				sectionHeight: 300,
				sectionWidth: 300,
				x: 150,
				y: 150,
			},
			{
				id: 'section-2',
				isGraphSection: true,
				sectionHeight: 120,
				sectionWidth: 120,
				x: 120,
				y: 120,
			},
		] as never;
		const viewState = createViewState();
		viewState.graphMode = '2d';
		viewState.timelineActive = false;
		viewState.graphLayout = {
			collapsedNodes: {},
			pinnedNodes: {},
			sections: {
				'section-1': {
					id: 'section-1',
					label: 'Parent',
					color: '#60a5fa',
					x: 0,
					y: 0,
					width: 300,
					height: 300,
					collapsed: false,
					updatedAt: '2026-05-13T09:30:00.000Z',
				},
				'section-2': {
					id: 'section-2',
					label: 'Child',
					color: '#22c55e',
					x: 420,
					y: 0,
					width: 120,
					height: 120,
					collapsed: false,
					updatedAt: '2026-05-13T09:30:00.000Z',
				},
			},
			ownership: {},
		};

		render(
			<GraphViewportShell
				callbacks={createCallbacks()}
				graphLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={createInteractions()}
				theme="light"
				viewState={viewState}
			/>,
		);

		const viewportProps = harness.viewport.mock.calls[0]?.[0] as {
			onSectionDragEnd(sectionId: string): void;
		};
		viewportProps.onSectionDragEnd('section-2');

		expect(harness.postMessage).toHaveBeenCalledWith({
			type: 'UPDATE_GRAPH_LAYOUT_OWNER',
			payload: {
				itemId: 'section-2',
				itemKind: 'section',
				ownerSectionId: 'section-1',
			},
		});
	});
});
