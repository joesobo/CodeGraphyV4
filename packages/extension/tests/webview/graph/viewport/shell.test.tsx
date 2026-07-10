import React from 'react';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import type { GraphViewStoreState } from '../../../../src/webview/components/graph/view/store';
import type { UseGraphInteractionRuntimeResult } from '../../../../src/webview/components/graph/runtime/use/interaction';
import type { GraphRuntime } from '../../../../src/webview/components/graph/runtime/use/state';
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

function createGraphData(): GraphRuntime['renderer']['graphData'] {
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

function createGraphState(graphData: GraphRuntime['renderer']['graphData']): GraphRuntime {
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
	const containerRef = { current: null };
	const fg2dRef = { current: undefined };
	const fg3dRef = { current: undefined };
	const graphDataRef = { current: { links: graphData.links.map(link => ({ ...link })), nodes: graphData.nodes.map(node => ({ ...node })) } };
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
		dataRef: { current: dataRefCurrent },
		directionColorRef: { current: '#22c55e' },
		directionModeRef: { current: 'arrows' },
		graphCursorRef: { current: 'default' },
		highlightVersion: 0,
		highlightedNeighborsRef: { current: new Set() },
		highlightedNodeRef: { current: null },
		lastClickRef: { current: null },
		renderer: {
			containerRef,
			fg2dRef,
			graphData,
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
		edgeDecorationsRef: { current: {} },
		favoritesRef: { current: new Set() },
		graphAppearanceRef: { current: { labelForeground: '#f8fafc' } },
		nodeDecorationsRef: { current: {} },
		nodeSizeModeRef: { current: 'connections' },
		setHighlightVersion: vi.fn(),
		timelineActiveRef: { current: true },
		showLabelsRef: { current: true },
		themeRef: { current: 'dark' },
	} as unknown as GraphRuntime;
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
	};
}

function createViewState(): Pick<
	GraphViewStoreState,
	'bidirectionalMode' | 'dagMode' | 'depthMode' | 'directionMode' | 'favorites' | 'graphMode' | 'graphViewContributionStatuses' | 'nodeSizeMode' | 'particleSize' | 'particleSpeed' | 'physicsPaused' | 'physicsSettings' | 'pluginContextMenuItems' | 'pluginStatuses' | 'setGraphMode' | 'showLabels'
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
		dagMode: 'td',
		depthMode: false,
		directionMode: 'arrows',
		favorites: new Set(['src/app.ts']),
		graphMode: '2d',
		graphViewContributionStatuses: [],
		nodeSizeMode: 'connections',
		particleSize: 3,
		particleSpeed: 0.2,
		physicsPaused: false,
		physicsSettings,
		pluginContextMenuItems: [],
		pluginStatuses: [],
		setGraphMode: vi.fn(),
		showLabels: true,
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

	it('publishes mutable viewport controls for plugin-owned world overlays', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const reheatSimulation = vi.fn();
		const resumeAnimation = vi.fn();
		graphState.renderer.fg2dRef.current = {
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
		act(() => {
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
		});
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
		expect(graphState.renderer.graphDataRef.current.nodes[0]).toMatchObject({
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

	it('skips plugin viewport publication when the plugin host has no viewport consumers', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const interactions = createInteractions();
		const callbacks = createCallbacks();
		const viewState = { ...createViewState(), graphMode: '2d' as const };
		const pluginHost = {
			getOverlays: vi.fn(() => []),
			hasGraphViewViewportConsumers: vi.fn(() => false),
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
		act(() => {
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
		});

		expect(pluginHost.hasGraphViewViewportConsumers).toHaveBeenCalledOnce();
		expect(pluginHost.setGraphViewViewportState).not.toHaveBeenCalled();
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
		act(() => {
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 2);
		});
		expect(graphStore.getState().graphViewportScale).toBe(2);

		act(() => {
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 2.005);
		});
		expect(graphStore.getState().graphViewportScale).toBe(2);
	});

	it('does not rerender the viewport for every moving graph frame', () => {
		const graphData = createGraphData();
		graphData.nodes[0] = { ...graphData.nodes[0], x: 10, y: 20 };
		graphData.nodes[1] = { ...graphData.nodes[1], x: 30, y: 40 };
		const graphState = createGraphState(graphData);
		let frameOffset = 0;
		const graph2ScreenCoords = vi.fn((x: number, y: number) => ({
			x: x + frameOffset,
			y: y + frameOffset,
		}));
		graphState.renderer.fg2dRef.current = {
			graph2ScreenCoords,
			screen2GraphCoords: (x: number, y: number) => ({ x: x - frameOffset, y: y - frameOffset }),
			zoom: () => 1,
		} as never;
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
		act(() => {
			frameOffset = 1;
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
		});

		const renderCountAfterAccessibilityPublish = harness.viewport.mock.calls.length;
		const projectedNodesAfterAccessibilityPublish = graph2ScreenCoords.mock.calls.length;

		for (frameOffset = 2; frameOffset <= 12; frameOffset += 1) {
			act(() => {
				viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
			});
		}

		expect(renderCountAfterAccessibilityPublish).toBeGreaterThan(1);
		expect(harness.viewport.mock.calls.length).toBe(renderCountAfterAccessibilityPublish);
		expect(graph2ScreenCoords.mock.calls.length).toBe(projectedNodesAfterAccessibilityPublish);
	});

	it('waits for graph coordinates before projecting accessibility nodes', () => {
		const graphData = createGraphData();
		const graphState = createGraphState(graphData);
		const graph2ScreenCoords = vi.fn((x: number, y: number) => ({ x, y }));
		graphState.renderer.fg2dRef.current = {
			graph2ScreenCoords,
			screen2GraphCoords: (x: number, y: number) => ({ x, y }),
			zoom: () => 1,
		} as never;
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
		act(() => {
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
		});
		expect(graph2ScreenCoords).not.toHaveBeenCalled();

		graphState.renderer.graphDataRef.current.nodes[0] = {
			...graphState.renderer.graphDataRef.current.nodes[0],
			x: 10,
			y: 20,
		};
		graphState.renderer.graphDataRef.current.nodes[1] = {
			...graphState.renderer.graphDataRef.current.nodes[1],
			x: 30,
			y: 40,
		};

		act(() => {
			viewportProps.surface2dProps.onRenderFramePost({} as CanvasRenderingContext2D, 1);
		});
		expect(graph2ScreenCoords).toHaveBeenCalledTimes(2);
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
