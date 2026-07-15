import type { MutableRefObject } from 'react';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import {
	hideGraphTooltipState,
	type GraphTooltipRect,
	type GraphTooltipState,
} from '../../tooltip/model';
import type { FGNode } from '../../model/build';
import type { GraphTooltipInteractionDependencies } from '../use/tooltip/hook';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import type { IFileInfo } from '../../../../../shared/files/info';
import { scheduleTooltipHover } from './schedule';

export interface TooltipHoverOptions {
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

function clearTooltipHoverState(
	hoveredNodeRef: MutableRefObject<FGNode | null>,
	interactionHandlers: GraphTooltipInteractionDependencies,
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>,
	stopTracking: () => void,
): void {
  interactionHandlers.setGraphCursor('default');
  hoveredNodeRef.current = null;
  stopTracking();
  setTooltipData(hideGraphTooltipState);
  interactionHandlers.sendGraphInteraction('graph:nodeHover', { node: null });
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
		clearTooltipHoverState(
			hoveredNodeRef,
			interactionHandlers,
			setTooltipData,
			stopTracking,
		);
		return;
	}

	interactionHandlers.setGraphCursor('pointer');
	interactionHandlers.sendGraphInteraction('graph:nodeHover', { node: { id: node.id, label: node.label } });

	hoveredNodeRef.current = node;
	scheduleTooltipHover(node, {
		dataRef,
		fileInfoCacheRef,
		getNodeRect,
		pluginHost,
		postMessage,
		setTooltipData,
		startTracking,
		tooltipTimeoutRef,
	});
}
