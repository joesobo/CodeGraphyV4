import {
  type MutableRefObject,
} from 'react';
import type {
  ForceGraphMethods as FG2DMethods,
  LinkObject,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import * as THREE from 'three';
import SpriteText from 'three-spritetext';
import type { IGraphData } from '../../../../../../shared/graph/contracts';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import { ThemeKind } from '../../../../../theme/useTheme';
import type { WebviewPluginHost } from '../../../../../pluginHost/manager';
import {
  type FGLink,
  type FGNode,
} from '../../../model/build';
import type { GraphContainerSize } from '../../../rendering/surface/sharedProps';
import { useContainerSize } from '../../containerSize';
import { useDirectional } from '../directional/indicators';
import { useLabelVisibility } from '../directional/labelVisibility';
import { useMeshHighlights } from '../directional/meshHighlights';
import { useNodeAppearance } from '../directional/nodeAppearance';
import { usePhysicsRuntime } from './physics';
import { usePluginOverlays } from '../../pluginOverlays';

export interface UseGraphRenderingRuntimeOptions {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  dataRef: MutableRefObject<IGraphData>;
  fg2dRef: MutableRefObject<FG2DMethods<FGNode, FGLink> | undefined>;
  fg3dRef: MutableRefObject<FG3DMethods<FGNode, FGLink> | undefined>;
  getArrowColor: (this: void, link: LinkObject) => string;
  getArrowRelPos: (this: void, link: LinkObject) => number;
  getLinkParticles: (this: void, link: LinkObject) => number;
  getParticleColor: (this: void, link: LinkObject) => string;
  graphDataRef: MutableRefObject<{ nodes: FGNode[]; links: FGLink[] }>;
  graphLayoutKey: string;
  graphMode: '2d' | '3d';
  highlightVersion: number;
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
  nodeSizeMode: string;
  particleSize: number;
  particleSpeed: number;
  physicsPaused?: boolean;
  physicsSettings: IPhysicsSettings;
  pluginHost?: WebviewPluginHost;
  selectedNodesSetRef: MutableRefObject<Set<string>>;
  showLabels: boolean;
  spritesRef: MutableRefObject<Map<string, SpriteText>>;
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
  dataRef,
  fg2dRef,
  fg3dRef,
  getArrowColor,
  getArrowRelPos,
  getLinkParticles,
  getParticleColor,
  graphDataRef,
  graphLayoutKey,
  graphMode,
  highlightVersion,
  highlightedNeighborsRef,
  highlightedNodeRef,
  meshesRef,
  nodeSizeMode,
  particleSize,
  particleSpeed,
  physicsPaused = false,
  physicsSettings,
  pluginHost,
  selectedNodesSetRef,
  showLabels,
  spritesRef,
  theme,
  favorites,
  directionMode,
}: UseGraphRenderingRuntimeOptions): UseGraphRenderingRuntimeResult {
  const containerSize = useContainerSize(containerRef);
  const renderPluginOverlays = usePluginOverlays(pluginHost);

  useMeshHighlights({
    graphDataRef,
    highlightVersion,
    highlightedNeighborsRef,
    highlightedNodeRef,
    meshesRef,
    selectedNodesSetRef,
  });

  useNodeAppearance({
    dataRef,
    favorites,
    graphDataRef,
    nodeSizeMode,
    theme,
  });

  useLabelVisibility({
    showLabels,
    spritesRef,
  });

  useDirectional({
    directionMode,
    fg2dRef,
    getArrowColor,
    getArrowRelPos,
    getLinkParticles,
    getParticleColor,
    graphMode,
    particleSize,
    particleSpeed,
    physicsPaused,
  });

  usePhysicsRuntime({
    fg2dRef,
    fg3dRef,
    graphMode,
    layoutKey: graphLayoutKey,
    physicsPaused,
    physicsSettings,
  });

  return {
    containerSize,
    renderPluginOverlays,
  };
}
