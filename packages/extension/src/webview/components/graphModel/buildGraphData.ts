import type { BuildGraphDataOptions, FGLink, FGNode } from '../graphModel';
import { buildGraphLinks } from './linkBuilder';
import { buildGraphNodes } from './nodeBuilder';
import { calculateNodeSizes } from './nodeSizing';

export function buildGraphData(options: BuildGraphDataOptions): { nodes: FGNode[]; links: FGLink[] } {
  const nodeSizes = calculateNodeSizes(options.data.nodes, options.data.edges, options.nodeSizeMode);
  const nodes = buildGraphNodes({
    nodes: options.data.nodes,
    edges: options.data.edges,
    nodeSizes,
    theme: options.theme,
    favorites: options.favorites,
    timelineActive: options.timelineActive,
    previousNodes: options.previousNodes,
    random: options.random,
  });
  const links = buildGraphLinks(options.data.edges, options.bidirectionalMode);

  return { nodes, links };
}
