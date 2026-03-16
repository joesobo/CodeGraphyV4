import {
  useCallback,
  useEffect,
  useRef,
  useState,
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
import type { GraphCursorStyle } from '../../graphSupport';
import type { FGLink, FGNode } from '../../graphModel';
import {
  type GraphTooltipState,
} from '../../graphTooltipModel';
import type { WebviewPluginHost } from '../../../pluginHost';
import { handleTooltipNodeHover } from './tooltipHover';
import { getTooltipNodeRect } from './tooltipRect';
import {
  startTooltipTracking as beginTooltipTracking,
  stopTooltipTracking as endTooltipTracking,
} from './tooltipTracking';

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

  const getNodeScreenRect = useCallback((node: FGNode) => getTooltipNodeRect({
    containerRef,
    fg2dRef,
  }, node), [containerRef, fg2dRef]);

  const stopTooltipTracking = useCallback(() => {
    endTooltipTracking(tooltipRafRef);
  }, []);

  const startTooltipTracking = useCallback(() => {
    beginTooltipTracking({
      getNodeRect: getNodeScreenRect,
      hoveredNodeRef,
      setTooltipData,
      tooltipRafRef,
    });
  }, [getNodeScreenRect]);

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
    interactionHandlers,
    pluginHost,
    postMessage,
    startTooltipTracking,
    stopTooltipTracking,
  ]);

  const handleMouseLeave = useCallback(() => {
    interactionHandlers.setGraphCursor('default');
  }, [interactionHandlers]);

  useEffect(() => stopTooltipTracking, [stopTooltipTracking]);

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
