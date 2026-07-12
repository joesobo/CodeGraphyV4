import type { MutableRefObject } from 'react';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import { ThemeKind } from '../../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { FGLink, FGNode } from '../../model/build';
import type { GraphContainerSize } from '../../rendering/surface/sharedProps';
import { useContainerSize } from '../containerSize';
import { useNodeAppearance } from './indicators/nodeAppearance';
import { usePluginOverlays } from '../pluginOverlays';

export interface UseGraphRenderingRuntimeOptions {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  appearance?: GraphAppearance;
  dataRef: MutableRefObject<IGraphData>;
  favorites: Set<string>;
  graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  nodeSizeMode: string;
  pluginHost?: WebviewPluginHost;
  theme: ThemeKind;
}

export interface UseGraphRenderingRuntimeResult {
  containerSize: GraphContainerSize;
  renderPluginOverlays(this: void, ctx: CanvasRenderingContext2D, globalScale: number): void;
}

export function useGraphRenderingRuntime({
  containerRef,
  appearance = DEFAULT_GRAPH_APPEARANCE,
  dataRef,
  favorites,
  graphDataRef,
  nodeSizeMode,
  pluginHost,
  theme,
}: UseGraphRenderingRuntimeOptions): UseGraphRenderingRuntimeResult {
  const containerSize = useContainerSize(containerRef);
  const renderPluginOverlays = usePluginOverlays(pluginHost);

  useNodeAppearance({
    appearance,
    dataRef,
    favorites,
    graphDataRef,
    nodeSizeMode,
    theme,
  });

  return {
    containerSize,
    renderPluginOverlays,
  };
}
