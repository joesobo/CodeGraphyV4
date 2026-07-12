import { type MutableRefObject } from 'react';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type {
  ForceGraphMethods as FG2DMethods,
  LinkObject,
} from 'react-force-graph-2d';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../../shared/settings/physics';
import { ThemeKind } from '../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { WebviewPluginHost } from '../../../../pluginHost/manager';
import { type FGLink, type FGNode } from '../../model/build';
import type { GraphContainerSize } from '../../rendering/surface/sharedProps';
import { useContainerSize } from '../containerSize';
import { useDirectional } from './indicators/directional';
import { useNodeAppearance } from './indicators/nodeAppearance';
import { usePhysicsRuntime } from './physics/hook';
import { usePluginOverlays } from '../pluginOverlays';

export interface UseGraphRenderingRuntimeOptions {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  appearance?: GraphAppearance;
  dataRef: MutableRefObject<IGraphData>;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  getArrowColor: (this: void, link: LinkObject) => string;
  getArrowRelPos: (this: void, link: LinkObject) => number;
  getLinkParticles: (this: void, link: LinkObject) => number;
  getParticleColor: (this: void, link: LinkObject) => string;
  graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphViewContributions?: CoreGraphViewContributionSet;
  graphDataLayoutKey: string;
  nodeSizeMode: string;
  particleSize: number;
  particleSpeed: number;
  physicsPaused?: boolean;
  physicsSettings: IPhysicsSettings;
  pluginHost?: WebviewPluginHost;
  theme: ThemeKind;
  favorites: Set<string>;
  directionMode: 'arrows' | 'particles' | 'none';
}

export interface UseGraphRenderingRuntimeResult {
  containerSize: GraphContainerSize;
  renderPluginOverlays(this: void, ctx: CanvasRenderingContext2D, globalScale: number): void;
}

export function useGraphRenderingRuntime({
  containerRef,
  appearance = DEFAULT_GRAPH_APPEARANCE,
  dataRef,
  fg2dRef,
  getArrowColor,
  getArrowRelPos,
  getLinkParticles,
  getParticleColor,
  graphDataRef,
  graphViewContributions,
  graphDataLayoutKey,
  nodeSizeMode,
  particleSize,
  particleSpeed,
  physicsPaused = false,
  physicsSettings,
  pluginHost,
  theme,
  favorites,
  directionMode,
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

  useDirectional({
    directionMode,
    fg2dRef,
    getArrowColor,
    getArrowRelPos,
    getLinkParticles,
    getParticleColor,
    particleSize,
    particleSpeed,
    physicsPaused,
  });

  usePhysicsRuntime({
    fg2dRef,
    graphDataRef,
    graphViewContributions,
    layoutKey: graphDataLayoutKey,
    physicsPaused,
    physicsSettings,
  });

  return {
    containerSize,
    renderPluginOverlays,
  };
}
