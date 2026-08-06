import type { MutableRefObject } from 'react';
import type {
	GraphTooltipRect,
	GraphTooltipState,
} from '../../tooltip/model';
import type { FGNode } from '../../model/build';

interface GraphTooltipTrackingOptions {
	getNodeRect(this: void, node: FGNode): GraphTooltipRect | null;
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	tooltipRectRef: MutableRefObject<GraphTooltipRect | null>;
}

export function clearTooltipAnchorSnapshot(
	tooltipRectRef: MutableRefObject<GraphTooltipRect | null>,
): void {
	tooltipRectRef.current = null;
}

export function initializeTooltipAnchorSnapshot({
	getNodeRect,
	hoveredNodeRef,
	tooltipRectRef,
}: GraphTooltipTrackingOptions): void {
	const node = hoveredNodeRef.current;
	tooltipRectRef.current = node ? getNodeRect(node) : null;
}

function rectsEqual(
	first: GraphTooltipRect,
	second: GraphTooltipRect,
): boolean {
	return first.x === second.x
		&& first.y === second.y
		&& first.radius === second.radius;
}

export function updateTooltipAnchorSnapshot({
	getNodeRect,
	hoveredNodeRef,
	setTooltipData,
	tooltipRectRef,
}: GraphTooltipTrackingOptions & {
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
}): void {
	const node = hoveredNodeRef.current;
	const rect = node ? getNodeRect(node) : null;
	if (!rect) {
		clearTooltipAnchorSnapshot(tooltipRectRef);
		return;
	}
	if (tooltipRectRef.current && rectsEqual(tooltipRectRef.current, rect)) return;

	tooltipRectRef.current = rect;
	setTooltipData(previous => previous.visible
		? { ...previous, nodeRect: rect }
		: previous);
}
