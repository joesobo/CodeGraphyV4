import {
	useRef,
	useState,
} from 'react';
import type { MutableRefObject } from 'react';
import type { FGNode } from '../../../model/build';
import type { GraphTooltipState } from '../../../tooltipModel';

export interface UseTooltipStateResult {
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	tooltipData: GraphTooltipState;
	tooltipRafRef: MutableRefObject<number | null>;
	tooltipTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useTooltipState(): UseTooltipStateResult {
	const hoveredNodeRef = useRef<FGNode | null>(null);
	const tooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const tooltipRafRef = useRef<number | null>(null);
	const [tooltipData, setTooltipData] = useState<GraphTooltipState>({
		visible: false,
		nodeRect: { x: 0, y: 0, radius: 0 },
		path: '',
		info: null,
		pluginSections: [],
	});

	return {
		hoveredNodeRef,
		setTooltipData,
		tooltipData,
		tooltipRafRef,
		tooltipTimeoutRef,
	};
}
