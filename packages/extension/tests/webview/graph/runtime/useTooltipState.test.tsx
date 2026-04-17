import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useTooltipState } from '../../../../src/webview/components/graph/runtime/use/tooltipState';

describe('graph/runtime/useTooltipState', () => {
	it('initializes the tooltip refs and hidden tooltip state', () => {
		const { result } = renderHook(() => useTooltipState());

		expect(result.current.hoveredNodeRef.current).toBeNull();
		expect(result.current.tooltipTimeoutRef.current).toBeNull();
		expect(result.current.tooltipRafRef.current).toBeNull();
		expect(result.current.tooltipData).toEqual({
			visible: false,
			nodeRect: { x: 0, y: 0, radius: 0 },
			path: '',
			info: null,
			pluginActions: [],
			pluginSections: [],
		});
	});
});
