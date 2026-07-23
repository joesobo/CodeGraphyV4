import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import type { OwnedGraph2dControls } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/contracts';
import { useGraphTooltip } from '../../../../../../src/webview/components/graph/runtime/use/tooltip/hook';

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

describe('graph/runtime/useGraphTooltip', () => {
	it('resets the cursor and hides the tooltip when hovering out', () => {
			const setGraphCursor = vi.fn();
		const graph = {
			graph2ScreenCoords: vi.fn(() => ({ x: 20, y: 30 })),
			zoom: vi.fn(() => 1),
		} as unknown as OwnedGraph2dControls;
		const container = document.createElement('div');
		container.append(document.createElement('canvas'));

		const { result } = renderHook(() => useGraphTooltip({
			containerRef: { current: container },
			dataRef: { current: { nodes: [createNode()], edges: [] } } as never,
			fg2dRef: { current: graph },
				fileInfoCacheRef: { current: new Map() } as never,
				interactionHandlers: {
					setGraphCursor,
			},
			postMessage: vi.fn(),
		}));

		act(() => {
			result.current.handleNodeHover(createNode());
			result.current.handleNodeHover(null);
		});

			expect(setGraphCursor).toHaveBeenLastCalledWith('default');
			expect(result.current.tooltipData.visible).toBe(false);
	});
});
