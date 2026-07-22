import type { IGraphNode } from '../../../../../shared/graph/contracts';
import { adjustColorForLightTheme } from '../../../../theme/useTheme';
import type { GraphAppearance } from '../../appearance/model';
import { MAX_NODE_SIZE, MIN_NODE_SIZE } from '../sizing/calculations';
import { graphNodeBorderColor, graphNodeBorderWidth, graphNodeDisplayColor } from './appearance';
import { DEFAULT_NODE_SIZE, getDepthOpacity, getDepthSizeMultiplier } from './display';

export interface GraphNodeStyle { baseOpacity: number; borderColor: string; borderWidth: number; color: string; isFavorite: boolean; size: number }

export function createGraphNodeStyle(node: IGraphNode, options: { appearance: GraphAppearance; favorites: ReadonlySet<string>; nodeSizes: ReadonlyMap<string, number> }, isLight: boolean): GraphNodeStyle {
  const displayColor = graphNodeDisplayColor(node, isLight ? adjustColorForLightTheme(node.color) : node.color, options.appearance);
  const isFavorite = options.favorites.has(node.id);
  const isFocused = node.depthLevel === 0;
  const semanticSize = (options.nodeSizes.get(node.id) ?? DEFAULT_NODE_SIZE) * getDepthSizeMultiplier(node.depthLevel);
  const runtimeSize = (node as IGraphNode & { size?: number }).size;
  const depthOpacity = getDepthOpacity(node.depthLevel);
  return {
    baseOpacity: node.metadata?.gitIgnored === true ? Math.min(depthOpacity, 0.45) : depthOpacity,
    borderColor: graphNodeBorderColor({ appearance: options.appearance, isFavorite, isFocused, nodeColor: displayColor }),
    borderWidth: graphNodeBorderWidth(isFocused, isFavorite), color: displayColor, isFavorite,
    size: typeof runtimeSize === 'number' ? runtimeSize : Math.min(MAX_NODE_SIZE, Math.max(MIN_NODE_SIZE, semanticSize)),
  };
}
