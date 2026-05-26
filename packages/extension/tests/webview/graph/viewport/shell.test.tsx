import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import type { GraphViewStoreState } from '../../../../src/webview/components/graph/view/store';
import type { UseGraphInteractionRuntimeResult } from '../../../../src/webview/components/graph/runtime/use/interaction';
import type { UseGraphStateResult } from '../../../../src/webview/components/graph/runtime/use/state';
import { GraphViewportShell } from '../../../../src/webview/components/graph/viewport/shell';
import { graphStore } from '../../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
	postMessage: vi.fn(),
	useGraphEventEffects: vi.fn(),
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

vi.mock('../../../../src/webview/components/graph/runtime/use/events/effects', () => ({
	useGraphEventEffects: harness.useGraphEventEffects,
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
				customRuntimeState: { owner: 'plugin-a' },
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
	'bidirectionalMode' | 'currentCommitSha' | 'dagMode' | 'depthMode' | 'directionMode' | 'favorites' | 'graphMode' | 'graphViewContributionStatuses' | 'nodeSizeMode' | 'particleSize' | 'particleSpeed' | 'physicsPaused' | 'physicsSettings' | 'pluginContextMenuItems' | 'setGraphMode' | 'showLabels' | 'timelineActive' | 'timelineCommits'
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
		graphMode: '3d',
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
		harness.useGraphEventEffects.mockReset();
		harness.useGraphRenderingRuntime.mockReset();
		harness.useGraphViewportModel.mockReset();
		harness.viewport.mockReset();
		graphStore.getState().setGraphViewportScale(null);
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
		graphState.fg2dRef.current = {
			graph2ScreenCoords: (x: number, y: number) => ({ x: x + 10, y: y + 20 }),
			screen2GraphCoords: (x: number, y: number) => ({ x: x - 10, y: y - 20 }),
			zoom: () => 1.75,
		} as never;
		const interactions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = createViewState();
		const handleEngineStop = vi.fn();
		const pluginHost = {
			getOverlays: vi.fn(),
			setGraphViewViewportState: vi.fn(),
		};

		render(
			<GraphViewportShell
				callbacks={callbacks}
				graphDataLayoutKey="connections::"
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
			graphDataLayoutKey: 'connections::',
			graphViewContributions: undefined,
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
			timelineActive: true,
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
		expect(harness.useGraphEventEffects).toHaveBeenCalledWith(expect.objectContaining({
			containerRef: graphState.containerRef,
			dataRef: graphState.dataRef,
			directionColorRef: graphState.directionColorRef,
			directionModeRef: graphState.directionModeRef,
			graphDataRef: graphState.graphDataRef,
			graphMode: '3d',
			interactionHandlers: interactions.interactionHandlers,
			fileInfoCacheRef: graphState.fileInfoCacheRef,
			selectedNodes: graphState.selectedNodes,
			setTooltipData: interactions.setTooltipData,
			showLabelsRef: graphState.showLabelsRef,
			themeRef: graphState.themeRef,
			tooltipPath: '',
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

		const viewportProps = harness.viewport.mock.calls.at(-1)?.[0] as {
			surface2dProps: {
				onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number): void;
			};
		};
		viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 2);
		expect(pluginHost.setGraphViewViewportState).toHaveBeenCalledWith(expect.objectContaining({
			graphMode: '3d',
			nodes: expect.arrayContaining([
				expect.objectContaining({
					customRuntimeState: { owner: 'plugin-a' },
					id: 'src/app.ts',
				}),
			]),
			timelineActive: true,
			zoom: 1.75,
		}));
	});

	it('publishes mutable viewport controls for plugin-owned world overlays', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const reheatSimulation = vi.fn();
		const resumeAnimation = vi.fn();
		graphState.fg2dRef.current = {
			d3ReheatSimulation: reheatSimulation,
			graph2ScreenCoords: (x: number, y: number) => ({ x, y }),
			resumeAnimation,
			screen2GraphCoords: (x: number, y: number) => ({ x, y }),
			zoom: () => 1,
		} as never;
		const interactions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = { ...createViewState(), graphMode: '2d' as const };
		const pluginHost = {
			getOverlays: vi.fn(),
			setGraphViewViewportState: vi.fn(),
		};

		render(
			<GraphViewportShell
				callbacks={callbacks}
				graphDataLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={interactions}
				pluginHost={pluginHost as never}
				theme="light"
				viewState={viewState}
			/>,
		);

		const viewportProps = harness.viewport.mock.calls.at(-1)?.[0] as {
			surface2dProps: {
				onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number): void;
			};
		};
		viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
		const viewportState = pluginHost.setGraphViewViewportState.mock.calls.at(-1)?.[0] as {
			reheatSimulation(): void;
			resumeAnimation(): void;
			updateNode(nodeId: string, updates: Record<string, unknown>): boolean;
		};

		expect(viewportState.updateNode('src/app.ts', {
			fx: 42,
			fy: 24,
			sectionHeight: 144,
			sectionWidth: 288,
			x: 42,
			y: 24,
		})).toBe(true);
		expect(graphState.graphDataRef.current.nodes[0]).toMatchObject({
			fx: 42,
			fy: 24,
			sectionHeight: 144,
			sectionWidth: 288,
			x: 42,
			y: 24,
		});
		expect(viewportState.updateNode('missing.ts', { x: 1 })).toBe(false);

		viewportState.resumeAnimation();
		viewportState.reheatSimulation();
		expect(resumeAnimation).toHaveBeenCalledOnce();
		expect(reheatSimulation).toHaveBeenCalledOnce();
	});

	it('publishes 2d graph viewport scale changes from render frames', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const interactions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = { ...createViewState(), graphMode: '2d' as const };

		render(
			<GraphViewportShell
				callbacks={callbacks}
				graphDataLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={interactions}
				theme="light"
				viewState={viewState}
			/>,
		);

		const viewportProps = harness.viewport.mock.calls.at(-1)?.[0] as {
			surface2dProps: {
				onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number): void;
			};
		};
		viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 2);
		expect(graphStore.getState().graphViewportScale).toBe(2);

		viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 2.005);
		expect(graphStore.getState().graphViewportScale).toBe(2);
	});

	it('skips plugin viewport state publication when no plugin host is mounted', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const renderPluginOverlays = vi.fn();
		harness.useGraphRenderingRuntime.mockReturnValue({
			containerSize: { height: 320, width: 480 },
			renderPluginOverlays,
		});

		render(
			<GraphViewportShell
				callbacks={createCallbacks()}
				graphDataLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={createInteractions()}
				theme="light"
				viewState={createViewState()}
			/>,
		);

		const viewportProps = harness.viewport.mock.calls.at(-1)?.[0] as {
			surface2dProps: {
				onRenderFramePost(ctx: CanvasRenderingContext2D, globalScale: number): void;
			};
		};
		expect(() => viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1)).not.toThrow();
		expect(renderPluginOverlays).toHaveBeenCalledWith(expect.anything(), 1);
	});

	it('clears plugin viewport state for the current plugin host on host changes and unmount', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const interactions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = createViewState();
		const firstPluginHost = {
			getOverlays: vi.fn(),
			setGraphViewViewportState: vi.fn(),
		};
		const secondPluginHost = {
			getOverlays: vi.fn(),
			setGraphViewViewportState: vi.fn(),
		};

		const { rerender, unmount } = render(
			<GraphViewportShell
				callbacks={callbacks}
				graphDataLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={interactions}
				pluginHost={firstPluginHost as never}
				theme="light"
				viewState={viewState}
			/>,
		);

		rerender(
			<GraphViewportShell
				callbacks={callbacks}
				graphDataLayoutKey="connections::"
				graphState={graphState}
				handleEngineStop={vi.fn()}
				interactions={interactions}
				pluginHost={secondPluginHost as never}
				theme="light"
				viewState={viewState}
			/>,
		);
		expect(firstPluginHost.setGraphViewViewportState).toHaveBeenCalledWith(null);
		expect(secondPluginHost.setGraphViewViewportState).not.toHaveBeenCalledWith(null);

		unmount();
		expect(secondPluginHost.setGraphViewViewportState).toHaveBeenCalledWith(null);
	});

	it('unmounts without plugin viewport cleanup when no plugin host is mounted', () => {
		const graphData = createGraphData();

		const { unmount } = render(
			<GraphViewportShell
				callbacks={createCallbacks()}
				graphDataLayoutKey="connections::"
				graphState={createGraphState(graphData)}
				handleEngineStop={vi.fn()}
				interactions={createInteractions()}
				theme="light"
				viewState={createViewState()}
			/>,
		);

		expect(() => unmount()).not.toThrow();
	});

});
