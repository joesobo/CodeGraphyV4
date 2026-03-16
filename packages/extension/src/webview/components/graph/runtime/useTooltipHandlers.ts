import {
	useCallback,
	useEffect,
	type MutableRefObject,
} from 'react';
import type {
	ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
	IFileInfo,
	IGraphData,
	WebviewToExtensionMessage,
} from '../../../../shared/types';
import type { FGLink, FGNode } from '../../graphModel';
import type { GraphTooltipState } from '../../graphTooltipModel';
import type { WebviewPluginHost } from '../../../pluginHost';
import type { GraphTooltipInteractionDependencies } from './useGraphTooltip';
import { handleTooltipNodeHover } from './tooltipHover';
import { getTooltipNodeRect } from './tooltipRect';
import {
	startTooltipTracking as beginTooltipTracking,
	stopTooltipTracking as endTooltipTracking,
} from './tooltipTracking';

export interface UseTooltipHandlersOptions {
	containerRef: MutableRefObject<HTMLDivElement | null>;
	dataRef: MutableRefObject<IGraphData>;
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
	fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	interactionHandlers: GraphTooltipInteractionDependencies;
	pluginHost?: WebviewPluginHost;
	postMessage: (this: void, message: WebviewToExtensionMessage) => void;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	tooltipRafRef: MutableRefObject<number | null>;
	tooltipTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export interface UseTooltipHandlersResult {
	handleMouseLeave: (this: void) => void;
	handleNodeHover: (this: void, node: FGNode | null) => void;
	stopTooltipTracking: (this: void) => void;
}

export function useTooltipHandlers({
	containerRef,
	dataRef,
	fg2dRef,
	fileInfoCacheRef,
	hoveredNodeRef,
	interactionHandlers,
	pluginHost,
	postMessage,
	setTooltipData,
	tooltipRafRef,
	tooltipTimeoutRef,
}: UseTooltipHandlersOptions): UseTooltipHandlersResult {
	const getNodeScreenRect = useCallback((node: FGNode) => getTooltipNodeRect({
		containerRef,
		fg2dRef,
	}, node), [containerRef, fg2dRef]);

	const stopTooltipTracking = useCallback(() => {
		endTooltipTracking(tooltipRafRef);
	}, [tooltipRafRef]);

	const startTooltipTracking = useCallback(() => {
		beginTooltipTracking({
			getNodeRect: getNodeScreenRect,
			hoveredNodeRef,
			setTooltipData,
			tooltipRafRef,
		});
	}, [getNodeScreenRect, hoveredNodeRef, setTooltipData, tooltipRafRef]);

	const handleNodeHover = useCallback((node: FGNode | null) => {
		handleTooltipNodeHover(node, {
			dataRef,
			fileInfoCacheRef,
			getNodeRect: getNodeScreenRect,
			hoveredNodeRef,
			interactionHandlers,
			pluginHost,
			postMessage,
			setTooltipData,
			startTracking: startTooltipTracking,
			stopTracking: stopTooltipTracking,
			tooltipTimeoutRef,
		});
	}, [
		dataRef,
		fileInfoCacheRef,
		getNodeScreenRect,
		hoveredNodeRef,
		interactionHandlers,
		pluginHost,
		postMessage,
		setTooltipData,
		startTooltipTracking,
		stopTooltipTracking,
		tooltipTimeoutRef,
	]);

	const handleMouseLeave = useCallback(() => {
		interactionHandlers.setGraphCursor('default');
	}, [interactionHandlers]);

	useEffect(
		() => () => {
			if (tooltipTimeoutRef.current) {
				clearTimeout(tooltipTimeoutRef.current);
				tooltipTimeoutRef.current = null;
			}
			stopTooltipTracking();
		},
		[stopTooltipTracking, tooltipTimeoutRef],
	);

	return {
		handleMouseLeave,
		handleNodeHover,
		stopTooltipTracking,
	};
}
