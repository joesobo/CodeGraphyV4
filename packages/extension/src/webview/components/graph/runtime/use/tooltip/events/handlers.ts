import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	type MutableRefObject,
} from 'react';
import type { OwnedGraph2dControls } from '../../../../rendering/surface/owned2d/view/surface/contracts';
import type { IFileInfo } from '../../../../../../../shared/files/info';
import type { IGraphData } from '../../../../../../../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../../../../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../../../../shared/settings/groups';
import type { FGNode } from '../../../../model/build';
import type { GraphTooltipRect, GraphTooltipState } from '../../../../tooltip/model';
import type { WebviewPluginHost } from '../../../../../../pluginHost/manager';
import type { GraphTooltipInteractionDependencies } from '../hook';
import { handleTooltipNodeHover } from '../../../tooltip/hover';
import { getTooltipNodeRect } from '../../../tooltip/rect';
import {
	clearTooltipAnchorSnapshot,
	initializeTooltipAnchorSnapshot,
	updateTooltipAnchorSnapshot,
} from '../../../tooltip/tracking';

export interface UseTooltipEventsOptions {
	containerRef: MutableRefObject<HTMLDivElement | null>;
	dataRef: MutableRefObject<IGraphData>;
	fg2dRef: MutableRefObject<OwnedGraph2dControls | undefined>;
	fileInfoCacheRef: MutableRefObject<Map<string, IFileInfo>>;
	hoveredNodeRef: MutableRefObject<FGNode | null>;
	interactionHandlers: GraphTooltipInteractionDependencies;
	legends?: readonly IGroup[];
	pluginHost?: WebviewPluginHost;
	postMessage: (this: void, message: WebviewToExtensionMessage) => void;
	setTooltipData: React.Dispatch<React.SetStateAction<GraphTooltipState>>;
	tooltipRectRef: MutableRefObject<GraphTooltipRect | null>;
	tooltipTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
	visible: boolean;
}

export interface UseTooltipEventsResult {
	handleMouseLeave: (this: void) => void;
	handleNodeHover: (this: void, node: FGNode | null) => void;
	clearTooltipAnchor: (this: void) => void;
	updateTooltipAnchor: (this: void) => void;
}

export function useTooltipEvents(options: UseTooltipEventsOptions): UseTooltipEventsResult {
	const optionsRef = useRef(options);
	useLayoutEffect(() => {
		optionsRef.current = options;
	}, [options]);
	const getNodeScreenRect = useCallback((node: FGNode) => {
		const current = optionsRef.current;
		return getTooltipNodeRect({
			containerRef: current.containerRef,
			fg2dRef: current.fg2dRef,
		}, node);
	}, []);

	const clearTooltipAnchor = useCallback(() => {
		clearTooltipAnchorSnapshot(optionsRef.current.tooltipRectRef);
	}, []);

	const initializeTooltipAnchor = useCallback(() => {
		const current = optionsRef.current;
		initializeTooltipAnchorSnapshot({
			getNodeRect: getNodeScreenRect,
			hoveredNodeRef: current.hoveredNodeRef,
			tooltipRectRef: current.tooltipRectRef,
		});
	}, [getNodeScreenRect]);

	const handleNodeHover = useCallback((node: FGNode | null) => {
		const current = optionsRef.current;
		handleTooltipNodeHover(node, {
			...current,
			getNodeRect: getNodeScreenRect,
			startTracking: initializeTooltipAnchor,
			stopTracking: clearTooltipAnchor,
		});
	}, [getNodeScreenRect, initializeTooltipAnchor, clearTooltipAnchor]);

	const handleMouseLeave = useCallback(() => {
		handleNodeHover(null);
	}, [handleNodeHover]);

	const updateTooltipAnchor = useCallback(() => {
		const current = optionsRef.current;
		updateTooltipAnchorSnapshot({
			getNodeRect: getNodeScreenRect,
			hoveredNodeRef: current.hoveredNodeRef,
			setTooltipData: current.setTooltipData,
			tooltipRectRef: current.tooltipRectRef,
		});
	}, [getNodeScreenRect]);

	useEffect(
		() => {
			const stopForVisibility = (): void => {
				if (document.visibilityState === 'hidden') handleNodeHover(null);
			};
			window.addEventListener('blur', handleMouseLeave);
			document.addEventListener('visibilitychange', stopForVisibility);
			return () => {
				window.removeEventListener('blur', handleMouseLeave);
				document.removeEventListener('visibilitychange', stopForVisibility);
				const current = optionsRef.current;
				if (current.tooltipTimeoutRef.current) {
					clearTimeout(current.tooltipTimeoutRef.current);
					current.tooltipTimeoutRef.current = null;
				}
				clearTooltipAnchorSnapshot(current.tooltipRectRef);
			};
		},
		[handleMouseLeave, handleNodeHover],
	);

	useEffect(() => {
		if (!options.visible) handleNodeHover(null);
	}, [handleNodeHover, options.visible]);

	return {
		handleMouseLeave,
		handleNodeHover,
		clearTooltipAnchor,
		updateTooltipAnchor,
	};
}
