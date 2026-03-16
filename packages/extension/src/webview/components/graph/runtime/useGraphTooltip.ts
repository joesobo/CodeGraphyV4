import type { MutableRefObject } from 'react';
import type {
	ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
	IFileInfo,
	IGraphData,
	WebviewToExtensionMessage,
} from '../../../../shared/types';
import type { GraphCursorStyle } from '../../graphSupport';
import type { FGLink, FGNode } from '../../graphModel';
import type { GraphTooltipState } from '../tooltipModel';
import type { WebviewPluginHost } from '../../../pluginHost';
import { useTooltipEvents } from './useTooltipEvents';
import { useTooltipState } from './useTooltipState';

export interface GraphTooltipInteractionDependencies {
	sendGraphInteraction: (this: void, event: string, eventData: unknown) => void;
	setGraphCursor: (this: void, cursor: GraphCursorStyle) => void;
}

export interface UseGraphTooltipOptions {
	containerRef: MutableRefObject<HTMLDivElement | null>;
	dataRef: MutableRefObject<IGraphData>;
	fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
	fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
	interactionHandlers: GraphTooltipInteractionDependencies;
	pluginHost?: WebviewPluginHost;
	postMessage: (this: void, message: WebviewToExtensionMessage) => void;
}

export interface UseGraphTooltipResult {
	handleMouseLeave: (this: void) => void;
	handleNodeHover: (this: void, node: FGNode | null) => void;
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	stopTooltipTracking: (this: void) => void;
	tooltipData: GraphTooltipState;
	tooltipTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useGraphTooltip({
	containerRef,
	dataRef,
	fg2dRef,
	fileInfoCacheRef,
	interactionHandlers,
	pluginHost,
	postMessage,
}: UseGraphTooltipOptions): UseGraphTooltipResult {
	const {
		hoveredNodeRef,
		setTooltipData,
		tooltipData,
		tooltipRafRef,
		tooltipTimeoutRef,
	} = useTooltipState();
	const {
		handleMouseLeave,
		handleNodeHover,
		stopTooltipTracking,
	} = useTooltipEvents({
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
	});

	return {
		handleMouseLeave,
		handleNodeHover,
		hoveredNodeRef,
		setTooltipData,
		stopTooltipTracking,
		tooltipData,
		tooltipTimeoutRef,
	};
}
