import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { GraphEdgeKind, IGraphData } from '../../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../../model/build';

export function forceNamespace(pluginId: string, contributionId: string): string {
  return `plugin:${pluginId}:${contributionId}`;
}

export function forceContextSignature(settings?: IPhysicsSettings): string {
  return [settings?.repelForce ?? '', settings?.linkDistance ?? '', settings?.linkForce ?? '',
    settings?.damping ?? '', settings?.centerForce ?? ''].join(':');
}

export function visiblePluginForceGraph(graphData: { nodes: FGNode[]; links: FGLink[] }): IGraphData {
  return {
    nodes: graphData.nodes,
    edges: graphData.links.map(link => ({
      id: link.id, from: link.from, to: link.to,
      kind: (link.kind ?? 'reference') as GraphEdgeKind,
      metadata: link.metadata, sources: [],
    })),
  };
}
