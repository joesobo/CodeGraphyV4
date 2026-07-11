import type { FGLink, FGNode } from '../../model/build';

export interface RuntimeGraphData {
  nodes: FGNode[];
  links: FGLink[];
}

export interface RuntimeGraphReconciliation {
  graphData: RuntimeGraphData;
  structureChanged: boolean;
}

const nodeMotionKeys = new Set([
  'index',
  'x', 'y', 'z',
  'vx', 'vy', 'vz',
  'fx', 'fy', 'fz',
]);
const linkRuntimeKeys = new Set(['index', 'source', 'target']);

export function reconcileRuntimeGraphData(
  current: RuntimeGraphData,
  desired: RuntimeGraphData,
): RuntimeGraphReconciliation {
  const currentNodes = new Map(current.nodes.map(node => [node.id, node]));
  const currentLinks = new Map(current.links.map(link => [link.id, link]));
  let structureChanged = current.nodes.length !== desired.nodes.length
    || current.links.length !== desired.links.length;

  const nodes = desired.nodes.map(desiredNode => {
    const currentNode = currentNodes.get(desiredNode.id);
    if (!currentNode) {
      structureChanged = true;
      return desiredNode;
    }
    replacePresentation(currentNode, desiredNode, nodeMotionKeys);
    return currentNode;
  });

  const links = desired.links.map(desiredLink => {
    const currentLink = currentLinks.get(desiredLink.id);
    if (!currentLink) {
      structureChanged = true;
      return desiredLink;
    }
    if (!sameLinkTopology(currentLink, desiredLink)) {
      structureChanged = true;
      return desiredLink;
    }
    replacePresentation(currentLink, desiredLink, linkRuntimeKeys);
    return currentLink;
  });

  return {
    graphData: { nodes, links },
    structureChanged,
  };
}

function sameLinkTopology(current: FGLink, desired: FGLink): boolean {
  return current.from === desired.from
    && current.to === desired.to
    && current.kind === desired.kind;
}

function replacePresentation<T extends object>(
  current: T,
  desired: T,
  protectedKeys: ReadonlySet<string>,
): void {
  const currentRecord = current as Record<string, unknown>;
  const desiredRecord = desired as Record<string, unknown>;
  for (const key of Object.keys(currentRecord)) {
    if (!protectedKeys.has(key) && !(key in desiredRecord)) delete currentRecord[key];
  }
  for (const [key, value] of Object.entries(desiredRecord)) {
    if (!protectedKeys.has(key)) currentRecord[key] = value;
  }
}
