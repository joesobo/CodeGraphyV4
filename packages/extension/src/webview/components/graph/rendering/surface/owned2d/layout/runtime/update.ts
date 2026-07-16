import type { IPhysicsSettings } from '../../../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../../../model/build';
import type { OwnedGraphLayout } from './model';
import { sameOwnedGraphShape } from './comparison';
import { buildOwnedGraphLayoutData } from './data';
import { applyOwnedPhysicsSettings } from './settings';

function preserveNodeState(layout: OwnedGraphLayout, nodes: FGNode[]): void {
  const indexes = new Map(layout.engine.nodeIds.map((id, index) => [id, index]));
  for (const node of nodes) {
    const index = indexes.get(node.id);
    if (index === undefined) continue;
    node.x = layout.engine.x[index]; node.y = layout.engine.y[index];
    node.vx = layout.engine.vx[index]; node.vy = layout.engine.vy[index];
    if (layout.nodes[index]?.isDragging === true) {
      node.isDragging = true; node.fx = node.x; node.fy = node.y;
    }
  }
}

export function updateOwnedGraphLayout(layout: OwnedGraphLayout, nodes: FGNode[], links: FGLink[], settings: IPhysicsSettings): void {
  preserveNodeState(layout, nodes);
  const data = buildOwnedGraphLayoutData(nodes, links);
  if (!sameOwnedGraphShape(layout.engine, data.input)) {
    layout.engine.setGraph(data.input);
    applyOwnedPhysicsSettings(layout.engine, settings);
    layout.membershipRevision += 1;
  }
  layout.nodes = nodes;
  layout.links = data.resolvedLinks;
}

export function syncOwnedLayoutNodesAtVersion(layout: OwnedGraphLayout, positionVersion: number, synchronizedVersion: number): number {
  if (synchronizedVersion === positionVersion) return synchronizedVersion;
  syncOwnedLayoutNodes(layout);
  return positionVersion;
}

export function syncOwnedLayoutNodes(layout: OwnedGraphLayout): void {
  layout.nodes.forEach((node, index) => {
    node.x = layout.engine.x[index]; node.y = layout.engine.y[index];
    node.vx = layout.engine.vx[index]; node.vy = layout.engine.vy[index];
  });
}
