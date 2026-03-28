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
import type { IGraphData, IPhysicsSettings } from '../../../../shared/contracts';
import { ThemeKind } from '../../../useTheme';
import type { WebviewPluginHost } from '../../../pluginHost/webviewPluginHost';
import {
  type FGLink,
  type FGNode,
} from '../../graphModel';
import type { GraphContainerSize } from '../rendering/sharedProps';
import { useContainerSize } from './containerSize';
import { useDirectional } from './useDirectional';
import { useLabelVisibility } from './useLabelVisibility';
import { useMeshHighlights } from './useMeshHighlights';
import { useNodeAppearance } from './useNodeAppearance';
import { usePhysicsRuntime } from './usePhysicsRuntime';
import { usePluginOverlays } from './pluginOverlays';

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
  graphMode: '2d' | '3d';
  highlightVersion: number;
  highlightedNeighborsRef: MutableRefObject<Set<string>>;
  highlightedNodeRef: MutableRefObject<string | null>;
  meshesRef: MutableRefObject<Map<string, THREE.Mesh>>;
  nodeSizeMode: string;
  particleSize: number;
  particleSpeed: number;
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
  graphMode,
  highlightVersion,
  highlightedNeighborsRef,
  highlightedNodeRef,
  meshesRef,
  nodeSizeMode,
  particleSize,
  particleSpeed,
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
  });

  usePhysicsRuntime({
    fg2dRef,
    fg3dRef,
    graphMode,
    physicsSettings,
  });

  return {
    containerSize,
    renderPluginOverlays,
  };
}
