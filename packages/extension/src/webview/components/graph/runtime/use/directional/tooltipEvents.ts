import {
	useEffect,
	type MutableRefObject,
} from 'react';
import type {
	ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type { IFileInfo } from '../../../../../../shared/files/info';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import type { FGLink, FGNode } from '../../../model/build';
import type { GraphTooltipState } from '../../../tooltipModel';
import type { WebviewPluginHost } from '../../../../../pluginHost/manager';
import type { GraphTooltipInteractionDependencies } from '../graph/tooltip';
import { handleTooltipNodeHover } from '../../tooltip/hover';
import { getTooltipNodeRect } from '../../tooltip/rect';
import {
	startTooltipTracking as beginTooltipTracking,
	stopTooltipTracking as endTooltipTracking,
} from '../../tooltip/tracking';

export interface UseTooltipEventsOptions {
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

export interface UseTooltipEventsResult {
	handleMouseLeave: (this: void) => void;
	handleNodeHover: (this: void, node: FGNode | null) => void;
	stopTooltipTracking: (this: void) => void;
}

export function useTooltipEvents({
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
}: UseTooltipEventsOptions): UseTooltipEventsResult {
	const getNodeScreenRect = (node: FGNode) => getTooltipNodeRect({
		containerRef,
		fg2dRef,
	}, node);

	const stopTooltipTracking = () => {
		endTooltipTracking(tooltipRafRef);
	};

	const startTooltipTracking = () => {
		beginTooltipTracking({
			getNodeRect: getNodeScreenRect,
			hoveredNodeRef,
			setTooltipData,
			tooltipRafRef,
		});
	};

	const handleNodeHover = (node: FGNode | null) => {
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
	};

	const handleMouseLeave = () => {
		interactionHandlers.setGraphCursor('default');
	};

	useEffect(
		() => () => {
			if (tooltipTimeoutRef.current) {
				clearTimeout(tooltipTimeoutRef.current);
				tooltipTimeoutRef.current = null;
			}
			endTooltipTracking(tooltipRafRef);
		},
		[tooltipRafRef, tooltipTimeoutRef],
	);

	return {
		handleMouseLeave,
		handleNodeHover,
		stopTooltipTracking,
	};
}
