import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ForceGraphMethods as FG2DMethods } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../../../src/webview/components/graphModel';
import { useTooltipHandlers } from '../../../../src/webview/components/graph/runtime/useTooltipHandlers';

function createNode(): FGNode {
	return {
		id: 'src/app.ts',
		label: 'app.ts',
		size: 16,
		x: 12,
		y: 18,
		color: '#3b82f6',
		borderColor: '#1d4ed8',
		borderWidth: 2,
	} as FGNode;
}

describe('graph/runtime/useTooltipHandlers', () => {
	it('sets the cursor back to default on mouse leave', () => {
		const setGraphCursor = vi.fn();

		const { result } = renderHook(() => useTooltipHandlers({
			containerRef: { current: document.createElement('div') },
			dataRef: { current: { nodes: [], edges: [] } } as never,
			fg2dRef: { current: undefined },
			fileInfoCacheRef: { current: new Map() } as never,
			hoveredNodeRef: { current: null },
			interactionHandlers: {
				sendGraphInteraction: vi.fn(),
				setGraphCursor,
			},
			postMessage: vi.fn(),
			setTooltipData: vi.fn(),
			tooltipRafRef: { current: null },
			tooltipTimeoutRef: { current: null },
		}));

		act(() => {
			result.current.handleMouseLeave();
		});

		expect(setGraphCursor).toHaveBeenCalledWith('default');
	});

	it('delegates hover handling through the extracted tooltip helpers', () => {
		vi.useFakeTimers();
		const graph = {
			graph2ScreenCoords: vi.fn(() => ({ x: 20, y: 30 })),
			zoom: vi.fn(() => 1),
		} as unknown as FG2DMethods<FGNode, FGLink>;
		const container = document.createElement('div');
		container.append(document.createElement('canvas'));
		const setTooltipData = vi.fn();
		const setGraphCursor = vi.fn();
		const sendGraphInteraction = vi.fn();

		const { result } = renderHook(() => useTooltipHandlers({
			containerRef: { current: container },
			dataRef: { current: { nodes: [createNode()], edges: [] } } as never,
			fg2dRef: { current: graph },
			fileInfoCacheRef: { current: new Map() } as never,
			hoveredNodeRef: { current: null },
			interactionHandlers: {
				sendGraphInteraction,
				setGraphCursor,
			},
			postMessage: vi.fn(),
			setTooltipData,
			tooltipRafRef: { current: null },
			tooltipTimeoutRef: { current: null },
		}));

		act(() => {
			result.current.handleNodeHover(createNode());
			vi.advanceTimersByTime(500);
		});

		expect(setGraphCursor).toHaveBeenCalledWith('pointer');
		expect(sendGraphInteraction).toHaveBeenCalledWith('graph:nodeHover', {
			node: { id: 'src/app.ts', label: 'app.ts' },
		});
		expect(setTooltipData).toHaveBeenCalled();
		vi.useRealTimers();
	});
});
