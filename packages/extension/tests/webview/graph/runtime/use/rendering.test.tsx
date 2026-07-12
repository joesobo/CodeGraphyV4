import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../../src/shared/settings/physics';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../src/webview/components/graph/appearance/model';
import { useGraphRenderingRuntime } from '../../../../../src/webview/components/graph/runtime/use/rendering';

const renderingHarness = vi.hoisted(() => ({
	renderPluginOverlays: vi.fn(),
	useContainerSize: vi.fn(),
	useDirectional: vi.fn(),
	useNodeAppearance: vi.fn(),
	usePhysicsRuntime: vi.fn(),
	usePluginOverlays: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/runtime/containerSize', () => ({
	useContainerSize: renderingHarness.useContainerSize,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/pluginOverlays', () => ({
	usePluginOverlays: renderingHarness.usePluginOverlays,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/indicators/directional', () => ({
	useDirectional: renderingHarness.useDirectional,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/indicators/nodeAppearance', () => ({
	useNodeAppearance: renderingHarness.useNodeAppearance,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/physics/hook', () => ({
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
		const graphDataRef = { current: { links: [] as FGLink[], nodes: [] as FGNode[] } };
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
			getArrowColor,
			getArrowRelPos,
			getLinkParticles,
			getParticleColor,
			graphDataRef,
			graphDataLayoutKey: 'uniform::',
			nodeSizeMode: 'uniform',
			particleSize: 3,
			particleSpeed: 0.2,
			physicsSettings: PHYSICS_SETTINGS,
			pluginHost: pluginHost as never,
			theme: 'dark',
		}));

		expect(renderingHarness.useContainerSize).toHaveBeenCalledWith(containerRef);
		expect(renderingHarness.usePluginOverlays).toHaveBeenCalledWith(pluginHost);
		expect(renderingHarness.useNodeAppearance).toHaveBeenCalledWith({
			appearance: DEFAULT_GRAPH_APPEARANCE,
			dataRef,
			favorites: new Set(['favorite']),
			graphDataRef,
			nodeSizeMode: 'uniform',
			theme: 'dark',
		});
		expect(renderingHarness.useDirectional).toHaveBeenCalledWith({
			directionMode: 'particles',
			fg2dRef,
			getArrowColor,
			getArrowRelPos,
			getLinkParticles,
			getParticleColor,
			particleSize: 3,
			particleSpeed: 0.2,
			physicsPaused: false,
		});
		expect(renderingHarness.usePhysicsRuntime).toHaveBeenCalledWith({
			fg2dRef,
			graphDataRef,
			graphViewContributions: undefined,
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
