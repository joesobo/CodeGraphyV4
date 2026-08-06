import type {
  GraphRendererLink,
  GraphRendererNode,
  GraphRendererNodeStyle,
} from '@codegraphy-dev/graph-renderer';
import {
  CONNECTED_LINK_OPACITY,
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  GRAPH_NODE_BORDER_WIDTH,
  GRAPH_NODE_SELECTION_BORDER_WIDTH,
  LINK_BASE_WIDTH,
  MUTED_LINK_OPACITY,
  ORDINARY_LINK_OPACITY,
  computeConnectionSizes,
} from '@codegraphy-dev/graph-visuals';
import type { MaterialIconData } from './materialIconTheme';
import type { DesktopGraph, DesktopGraphNode } from './model';

export interface DesktopGraphAppearance {
  labelForeground: string;
  labelMutedForeground: string;
  linkHighlight: string;
  linkMuted: string;
  nodeSelectionBorder: string;
  stageBackground: string;
}

export interface DesktopGraphNodeVisual {
  imageUrl?: string;
  size: number;
  style: GraphRendererNodeStyle;
}

export function desktopGraphNodeSizes(graph: DesktopGraph): Map<string, number> {
  return computeConnectionSizes(graph.nodes, graph.edges);
}

export function createDesktopGraphNodeVisual(
  node: DesktopGraphNode,
  size: number,
  icon: MaterialIconData | undefined,
  selected: boolean,
  appearance: Pick<DesktopGraphAppearance, 'nodeSelectionBorder'>,
  highlighted = true,
): DesktopGraphNodeVisual {
  const folder = node.nodeType === 'folder';
  const color = icon?.color ?? (folder ? DEFAULT_FOLDER_NODE_COLOR : DEFAULT_NODE_COLOR);

  return {
    ...(icon ? { imageUrl: icon.imageUrl } : {}),
    size,
    style: {
      borderColor: selected ? appearance.nodeSelectionBorder : color,
      borderWidth: selected
        ? Math.max(GRAPH_NODE_BORDER_WIDTH, GRAPH_NODE_SELECTION_BORDER_WIDTH)
        : GRAPH_NODE_BORDER_WIDTH,
      cornerRadius: 0,
      fillColor: color,
      fillOpacity: 1,
      height: size * 2,
      opacity: highlighted ? 1 : 0.15,
      shape: 'circle',
      width: size * 2,
    },
  };
}

export function desktopGraphLinkColor(
  link: GraphRendererLink,
  selectedId: string | undefined,
  appearance: Pick<DesktopGraphAppearance, 'linkHighlight' | 'linkMuted'>,
): string {
  if (!selectedId) return DEFAULT_DIRECTION_COLOR;
  return graphLinkConnectsNode(link, selectedId)
    ? appearance.linkHighlight
    : appearance.linkMuted;
}

export function desktopGraphLinkOpacity(
  link: GraphRendererLink,
  selectedId: string | undefined,
): number {
  if (!selectedId) return ORDINARY_LINK_OPACITY;
  return graphLinkConnectsNode(link, selectedId)
    ? CONNECTED_LINK_OPACITY
    : MUTED_LINK_OPACITY;
}

export function desktopGraphLinkWidth(
  link: GraphRendererLink,
  selectedId: string | undefined,
): number {
  return selectedId && graphLinkConnectsNode(link, selectedId) ? 2 : LINK_BASE_WIDTH;
}

function graphLinkConnectsNode(link: GraphRendererLink, nodeId: string): boolean {
  return graphLinkEndpointId(link.source) === nodeId
    || graphLinkEndpointId(link.target) === nodeId;
}

function graphLinkEndpointId(endpoint: string | GraphRendererNode | undefined): string | undefined {
  return typeof endpoint === 'string' ? endpoint : endpoint?.id;
}
