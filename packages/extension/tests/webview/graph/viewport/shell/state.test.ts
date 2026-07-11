import { describe, expect, it, vi } from 'vitest';
import {
	createGraphViewViewportState,
	toGraphViewViewportNodes,
} from '../../../../../src/webview/components/graph/viewport/shell/state';

describe('graph/viewport/shell/state', () => {
	it('sanitizes viewport node fields while preserving plugin-owned custom state', () => {
		const nodes = toGraphViewViewportNodes([{
			customRuntimeState: { owner: 'plugin-a' },
			fx: 'bad',
			fy: 24,
			id: 'src/app.ts',
			isDragging: 'true',
			isPinned: false,
			size: 12,
			vx: Number.NaN,
			vy: 2,
			x: 42,
			y: undefined,
		} as never]);

		expect(nodes).toEqual([expect.objectContaining({
			customRuntimeState: { owner: 'plugin-a' },
			fx: undefined,
			fy: 24,
			id: 'src/app.ts',
			isDragging: undefined,
			isPinned: false,
			size: 12,
			vx: undefined,
			vy: 2,
			x: 42,
			y: undefined,
		})]);
	});

	it('uses identity coordinates and the frame scale when 2d graph controls are unavailable', () => {
		const graphNodes = [{ id: 'src/app.ts', label: 'app.ts' }];

		const viewportState = createGraphViewViewportState({
			globalScale: 1.5,
			graph: undefined,
			graphMode: '2d',
			nodes: graphNodes as never,
		});

		expect(viewportState.graphToScreen(4, 8)).toEqual({ x: 4, y: 8 });
		expect(viewportState.screenToGraph(4, 8)).toEqual({ x: 4, y: 8 });
		expect(viewportState.zoom).toBe(1.5);
	});

	it('keeps viewport controls as no-ops when a partial 2d graph is available', () => {
		const viewportState = createGraphViewViewportState({
			globalScale: 1.5,
			graph: {},
			graphMode: '2d',
			nodes: [{ id: 'src/app.ts' }] as never,
		});

		expect(viewportState.graphToScreen(4, 8)).toEqual({ x: 4, y: 8 });
		expect(viewportState.screenToGraph(4, 8)).toEqual({ x: 4, y: 8 });
		expect(viewportState.zoom).toBe(1.5);
		expect(() => viewportState.resumeAnimation()).not.toThrow();
		expect(() => viewportState.reheatSimulation()).not.toThrow();
	});

	it('mutates the matching live graph node for plugin viewport updates', () => {
		const graphNodes = [{ id: 'src/app.ts', x: 1 }];
		const viewportState = createGraphViewViewportState({
			globalScale: 1,
			graph: undefined,
			graphMode: '2d',
			nodes: graphNodes as never,
		});

		expect(viewportState.updateNode('src/app.ts', { fx: 10, fy: 20 })).toBe(true);
		expect(graphNodes[0]).toMatchObject({ fx: 10, fy: 20, x: 1 });
		expect(viewportState.updateNode('missing.ts', { fx: 30 })).toBe(false);
	});
});
