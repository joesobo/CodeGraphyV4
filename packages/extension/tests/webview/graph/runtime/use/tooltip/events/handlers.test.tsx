import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OwnedGraph2dControls } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/contracts';
import type { FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import { useTooltipEvents } from '../../../../../../../src/webview/components/graph/runtime/use/tooltip/events/handlers';

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

function createContainer(): HTMLDivElement {
	const container = document.createElement('div');
	const canvas = document.createElement('canvas');
	canvas.getBoundingClientRect = vi.fn(() => ({
		x: 0,
		y: 0,
		bottom: 56,
		height: 50,
		left: 4,
		right: 84,
		top: 6,
		width: 80,
		toJSON: () => ({}),
	}));
	container.append(canvas);
	return container;
}

function createGraph(): OwnedGraph2dControls {
	return {
		graph2ScreenCoords: vi.fn(() => ({ x: 20, y: 30 })),
		zoom: vi.fn(() => 1),
	} as unknown as OwnedGraph2dControls;
}

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('graph/runtime/useTooltipEvents', () => {
	it('sets the cursor back to default on mouse leave', () => {
		const setGraphCursor = vi.fn();

		const { result } = renderHook(() => useTooltipEvents({
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

	it('uses the latest handlers after rerender instead of stale callback dependencies', () => {
		vi.useFakeTimers();
		const firstSetTooltipData = vi.fn();
		const secondSetTooltipData = vi.fn();
		const firstSetGraphCursor = vi.fn();
		const secondSetGraphCursor = vi.fn();
		const firstSendGraphInteraction = vi.fn();
		const secondSendGraphInteraction = vi.fn();
		const firstPostMessage = vi.fn();
		const secondPostMessage = vi.fn();

		const initialProps = {
			containerRef: { current: createContainer() },
			dataRef: { current: { nodes: [createNode()], edges: [] } } as never,
			fg2dRef: { current: createGraph() },
			fileInfoCacheRef: { current: new Map() } as never,
			hoveredNodeRef: { current: null },
			interactionHandlers: {
				sendGraphInteraction: firstSendGraphInteraction,
				setGraphCursor: firstSetGraphCursor,
			},
			postMessage: firstPostMessage,
			setTooltipData: firstSetTooltipData,
			tooltipRafRef: { current: null },
			tooltipTimeoutRef: { current: null },
		};
		const { result, rerender } = renderHook(useTooltipEvents, {
			initialProps,
		});

		rerender({
			...initialProps,
			interactionHandlers: {
				sendGraphInteraction: secondSendGraphInteraction,
				setGraphCursor: secondSetGraphCursor,
			},
			postMessage: secondPostMessage,
			setTooltipData: secondSetTooltipData,
		});

		act(() => {
			result.current.handleMouseLeave();
			result.current.handleNodeHover(createNode());
			vi.advanceTimersByTime(500);
		});

		expect(firstSetGraphCursor).not.toHaveBeenCalled();
		expect(secondSetGraphCursor).toHaveBeenNthCalledWith(1, 'default');
		expect(secondSetGraphCursor).toHaveBeenNthCalledWith(2, 'pointer');
		expect(firstSendGraphInteraction).not.toHaveBeenCalled();
		expect(secondSendGraphInteraction).toHaveBeenCalledWith('graph:nodeHover', {
			node: { id: 'src/app.ts', label: 'app.ts' },
		});
		expect(firstSetTooltipData).not.toHaveBeenCalled();
		expect(secondSetTooltipData).toHaveBeenCalledWith(expect.objectContaining({
			path: 'src/app.ts',
		}));
		expect(firstPostMessage).not.toHaveBeenCalled();
		expect(secondPostMessage).toHaveBeenCalledWith({
			type: 'GET_FILE_INFO',
			payload: { path: 'src/app.ts' },
		});
	});
});
