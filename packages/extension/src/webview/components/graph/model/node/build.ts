import type { IGraphNode } from '../../../../../shared/graph/contracts';
import type { ThemeKind } from '../../../../theme/useTheme';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../build';
import { createGraphNodeStyle } from './styleBuild';
import { createGraphNodePositionState, createPreviousNodeStateMap, type PreviousNodeState } from './positionState';
export interface BuildGraphNodesOptions {
  nodes: IGraphNode[];
  appearance?: GraphAppearance;
  nodeSizes: Map<string, number>;
  theme: ThemeKind;
  favorites: Set<string>;
  previousNodes?: Array<Pick<FGNode, 'id' | 'fx' | 'fy' | 'vx' | 'vy' | 'x' | 'y'>>;
}

interface RuntimeGraphNodePresentation {
  [key: string]: unknown;
  ownerPluginId?: string;
  runtimeNodeType?: string;
  size?: number;
}

function createGraphNode(
  node: IGraphNode,
  options: {
    appearance: GraphAppearance;
    favorites: ReadonlySet<string>;
    nodeSizes: ReadonlyMap<string, number>;
  },
  isLight: boolean,
  previousNodeStates: ReadonlyMap<string, PreviousNodeState>,
): FGNode {
  const runtimeNode = node as IGraphNode & RuntimeGraphNodePresentation;
  const previous = previousNodeStates.get(node.id);
  const style = createGraphNodeStyle(node, options, isLight);
  const position = createGraphNodePositionState(node, previous);

  return {
    ...runtimeNode,
    id: node.id,
    label: node.label,
    ...style,
    isPinned: runtimeNode.isPinned === true,
    nodeType: node.nodeType,
    ownerPluginId: runtimeNode.ownerPluginId,
    runtimeNodeType: runtimeNode.runtimeNodeType,
    shape2D: node.shape2D,
    imageUrl: node.imageUrl,
    metadata: node.metadata,
    isCollapsible: node.isCollapsible,
    isCollapsed: node.isCollapsed,
    collapsedDescendantCount: node.collapsedDescendantCount,
    ...position,
  } as FGNode;
}

export function buildGraphNodes(options: BuildGraphNodesOptions): FGNode[] {
  const {
    nodes,
    appearance = DEFAULT_GRAPH_APPEARANCE,
    nodeSizes,
    theme,
    favorites,
    previousNodes = [],
  } = options;
  const isLight = theme === 'light';
  const previousNodeStates = createPreviousNodeStateMap(previousNodes);
  return nodes.map(node => createGraphNode(
    node,
    { appearance, nodeSizes, favorites },
    isLight,
    previousNodeStates,
  ));
}
