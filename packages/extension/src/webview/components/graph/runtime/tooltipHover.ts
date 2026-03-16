import type { MutableRefObject } from 'react';
import type {
	IFileInfo,
	IGraphData,
	WebviewToExtensionMessage,
} from '../../../../shared/types';
import {
	buildGraphTooltipContext,
	buildGraphTooltipState,
	hideGraphTooltipState,
	type GraphTooltipRect,
	type GraphTooltipState,
} from '../../graphTooltipModel';
import type { FGNode } from '../../graphModel';
import type { GraphTooltipInteractionDependencies } from './useGraphTooltip';
import type { WebviewPluginHost } from '../../../pluginHost';

interface TooltipHoverOptions {
	dataRef: MutableRefObject<IGraphData>;
	fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
	getNodeRect(this: void, node: FGNode): GraphTooltipRect | null;
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	interactionHandlers: GraphTooltipInteractionDependencies;
	pluginHost?: WebviewPluginHost;
	postMessage(this: void, message: WebviewToExtensionMessage): void;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	startTracking(this: void): void;
	stopTracking(this: void): void;
	tooltipTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function handleTooltipNodeHover(
	node: FGNode | null,
	{
		dataRef,
		fileInfoCacheRef,
		getNodeRect,
		hoveredNodeRef,
		interactionHandlers,
		pluginHost,
		postMessage,
		setTooltipData,
		startTracking,
		stopTracking,
		tooltipTimeoutRef,
	}: TooltipHoverOptions,
): void {
	if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);

	if (!node) {
		interactionHandlers.setGraphCursor('default');
		hoveredNodeRef.current = null;
		stopTracking();
		setTooltipData(hideGraphTooltipState);
		interactionHandlers.sendGraphInteraction('graph:nodeHover', { node: null });
		return;
	}

	interactionHandlers.setGraphCursor('pointer');
	interactionHandlers.sendGraphInteraction('graph:nodeHover', { node: { id: node.id, label: node.label } });

	hoveredNodeRef.current = node;
	const nodeId = node.id;
	tooltipTimeoutRef.current = setTimeout(() => {
		const pluginTooltip = pluginHost?.getTooltipContent(buildGraphTooltipContext({
			node,
			snapshot: dataRef.current,
		}));
		const tooltipState = buildGraphTooltipState({
			nodeId,
			rect: getNodeRect(node),
			cachedInfo: fileInfoCacheRef.current.get(nodeId) ?? null,
			pluginSections: pluginTooltip?.sections ?? [],
		});
		setTooltipData(tooltipState.tooltipData);

		if (tooltipState.shouldRequestFileInfo) {
			postMessage({ type: 'GET_FILE_INFO', payload: { path: nodeId } });
		}

		startTracking();
	}, 500);
}
