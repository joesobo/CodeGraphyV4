import type { MutableRefObject } from 'react';
import type {
	GraphTooltipRect,
	GraphTooltipState,
} from '../../tooltipModel';
import type { FGNode } from '../../model/build';

interface GraphTooltipTrackingOptions {
	getNodeRect(this: void, node: FGNode): GraphTooltipRect | null;
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	tooltipRafRef: MutableRefObject<number | null>;
}

export function stopTooltipTracking(
	tooltipRafRef: MutableRefObject<number | null>,
): void {
	if (tooltipRafRef.current !== null) {
		cancelAnimationFrame(tooltipRafRef.current);
		tooltipRafRef.current = null;
	}
}

export function startTooltipTracking({
	getNodeRect,
	hoveredNodeRef,
	setTooltipData,
	tooltipRafRef,
}: GraphTooltipTrackingOptions): void {
	const tick = (): void => {
		const node = hoveredNodeRef.current;
		if (!node) return;

		const rect = getNodeRect(node);
		if (rect) {
			setTooltipData(previous => previous.visible ? { ...previous, nodeRect: rect } : previous);
		}

		tooltipRafRef.current = requestAnimationFrame(tick);
	};

	tooltipRafRef.current = requestAnimationFrame(tick);
}
