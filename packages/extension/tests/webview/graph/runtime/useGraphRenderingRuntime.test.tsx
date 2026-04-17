import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import type SpriteText from 'three-spritetext';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import { useGraphRenderingRuntime } from '../../../../src/webview/components/graph/runtime/use/graph/rendering';

const renderingHarness = vi.hoisted(() => ({
	renderPluginOverlays: vi.fn(),
	useContainerSize: vi.fn(),
	useDirectional: vi.fn(),
	useLabelVisibility: vi.fn(),
	useMeshHighlights: vi.fn(),
	useNodeAppearance: vi.fn(),
	usePhysicsRuntime: vi.fn(),
	usePluginOverlays: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/runtime/containerSize', () => ({
	useContainerSize: renderingHarness.useContainerSize,
}));

vi.mock('../../../../src/webview/components/graph/runtime/pluginOverlays', () => ({
	usePluginOverlays: renderingHarness.usePluginOverlays,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/directional/indicators', () => ({
	useDirectional: renderingHarness.useDirectional,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/directional/labelVisibility', () => ({
	useLabelVisibility: renderingHarness.useLabelVisibility,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/directional/meshHighlights', () => ({
	useMeshHighlights: renderingHarness.useMeshHighlights,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/directional/nodeAppearance', () => ({
	useNodeAppearance: renderingHarness.useNodeAppearance,
}));

vi.mock('../../../../src/webview/components/graph/runtime/use/graph/physics', () => ({
	usePhysicsRuntime: renderingHarness.usePhysicsRuntime,
}));

const PHYSICS_SETTINGS: IPhysicsSettings = {
	centerForce: 0.1,
	damping: 0.7,
	linkDistance: 120,
	linkForce: 0.4,
	repelForce: 500,
};

function createGraphData(): IGraphData {
	return {
		edges: [],
		nodes: [],
	};
}

describe('graph/runtime/useGraphRenderingRuntime', () => {
	beforeEach(() => {
		renderingHarness.renderPluginOverlays.mockReset();
		renderingHarness.useContainerSize.mockReset();
		renderingHarness.useDirectional.mockReset();
		renderingHarness.useLabelVisibility.mockReset();
		renderingHarness.useMeshHighlights.mockReset();
		renderingHarness.useNodeAppearance.mockReset();
		renderingHarness.usePhysicsRuntime.mockReset();
		renderingHarness.usePluginOverlays.mockReset();
		renderingHarness.useContainerSize.mockReturnValue({ height: 360, width: 640 });
		renderingHarness.usePluginOverlays.mockReturnValue(renderingHarness.renderPluginOverlays);
	});

	it('returns the rendering contract that Graph consumes and wires each runtime helper', () => {
		const containerRef = { current: document.createElement('div') };
		const dataRef = { current: createGraphData() };
		const fg2dRef = { current: undefined };
		const fg3dRef = { current: undefined };
		const graphDataRef = { current: { links: [] as FGLink[], nodes: [] as FGNode[] } };
		const highlightedNeighborsRef = { current: new Set<string>() };
		const highlightedNodeRef = { current: null as string | null };
		const meshesRef = { current: new Map<string, THREE.Mesh>() };
		const selectedNodesSetRef = { current: new Set<string>() };
		const spritesRef = { current: new Map<string, SpriteText>() };
		const getArrowColor = vi.fn();
		const getArrowRelPos = vi.fn();
		const getLinkParticles = vi.fn();
		const getParticleColor = vi.fn();
		const pluginHost = { getOverlays: vi.fn() };

		const { result } = renderHook(() => useGraphRenderingRuntime({
			containerRef,
			dataRef,
			directionMode: 'particles',
			favorites: new Set(['favorite']),
			fg2dRef,
			fg3dRef,
			getArrowColor,
			getArrowRelPos,
			getLinkParticles,
			getParticleColor,
			graphDataRef,
			graphLayoutKey: 'uniform::',
			graphMode: '2d',
			highlightVersion: 4,
			highlightedNeighborsRef,
			highlightedNodeRef,
			meshesRef,
			nodeSizeMode: 'uniform',
			particleSize: 3,
			particleSpeed: 0.2,
			physicsSettings: PHYSICS_SETTINGS,
			pluginHost: pluginHost as never,
			selectedNodesSetRef,
			showLabels: true,
			spritesRef,
			theme: 'dark',
		}));

		expect(renderingHarness.useContainerSize).toHaveBeenCalledWith(containerRef);
		expect(renderingHarness.usePluginOverlays).toHaveBeenCalledWith(pluginHost);
		expect(renderingHarness.useMeshHighlights).toHaveBeenCalledWith({
			graphDataRef,
			highlightVersion: 4,
			highlightedNeighborsRef,
			highlightedNodeRef,
			meshesRef,
			selectedNodesSetRef,
		});
		expect(renderingHarness.useNodeAppearance).toHaveBeenCalledWith({
			dataRef,
			favorites: new Set(['favorite']),
			graphDataRef,
			nodeSizeMode: 'uniform',
			theme: 'dark',
		});
		expect(renderingHarness.useLabelVisibility).toHaveBeenCalledWith({
			showLabels: true,
			spritesRef,
		});
		expect(renderingHarness.useDirectional).toHaveBeenCalledWith({
			directionMode: 'particles',
			fg2dRef,
			getArrowColor,
			getArrowRelPos,
			getLinkParticles,
			getParticleColor,
			graphMode: '2d',
			particleSize: 3,
			particleSpeed: 0.2,
			physicsPaused: false,
		});
		expect(renderingHarness.usePhysicsRuntime).toHaveBeenCalledWith({
			fg2dRef,
			fg3dRef,
			graphMode: '2d',
			layoutKey: 'uniform::',
			physicsPaused: false,
			physicsSettings: PHYSICS_SETTINGS,
		});
		expect(result.current.containerSize).toEqual({ height: 360, width: 640 });

		const ctx = { canvas: { height: 180, width: 320 } } as CanvasRenderingContext2D;
		result.current.renderPluginOverlays(ctx, 2.5);

		expect(renderingHarness.renderPluginOverlays).toHaveBeenCalledWith(ctx, 2.5);
	});
});
