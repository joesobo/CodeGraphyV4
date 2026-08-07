import {
	useRef,
	useState,
} from 'react';
import type { MutableRefObject } from 'react';
import type { FGNode } from '../../../../model/build';
import type { GraphTooltipRect, GraphTooltipState } from '../../../../tooltip/model';

export interface UseTooltipStateResult {
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	tooltipData: GraphTooltipState;
	tooltipRectRef: MutableRefObject<GraphTooltipRect | null>;
	tooltipTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useTooltipState(): UseTooltipStateResult {
	const hoveredNodeRef = useRef<FGNode | null>(null);
	const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const tooltipRectRef = useRef<GraphTooltipRect | null>(null);
	const [tooltipData, setTooltipData] = useState<GraphTooltipState>({
		visible: false,
		nodeRect: { x: 0, y: 0, radius: 0 },
		path: '',
		info: null,
		incomingCount: 0,
		outgoingCount: 0,
		pluginActions: [],
		pluginSections: [],
	});

	return {
		hoveredNodeRef,
		setTooltipData,
		tooltipData,
		tooltipRectRef,
		tooltipTimeoutRef,
	};
}
