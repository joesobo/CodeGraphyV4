import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphViewForceAdapter } from '@codegraphy-dev/plugin-api';
import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { GraphEdgeKind, IGraphData } from '../../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../../model/build';

interface InstalledForceAdapter {
  adapter: IGraphViewForceAdapter;
  contribution: CoreGraphViewContributionSet['forces'][number]['contribution'];
  contextSignature: string;
  nodes: readonly FGNode[];
}

export interface OwnedGraphPluginForces {
  active(): boolean;
  sync(
    contributions: CoreGraphViewContributionSet | undefined,
    graphData: { nodes: FGNode[]; links: FGLink[] },
    physicsSettings?: IPhysicsSettings,
  ): boolean;
  tick(alpha?: number): void;
  dispose(): void;
}

function namespace(pluginId: string, contributionId: string): string {
  return `plugin:${pluginId}:${contributionId}`;
}

function contextSignature(settings?: IPhysicsSettings): string {
  return [
    settings?.repelForce ?? '',
    settings?.linkDistance ?? '',
    settings?.linkForce ?? '',
    settings?.damping ?? '',
    settings?.centerForce ?? '',
  ].join(':');
}

function visibleGraph(graphData: { nodes: FGNode[]; links: FGLink[] }): IGraphData {
  return {
    nodes: graphData.nodes,
    edges: graphData.links.map(link => ({
      id: link.id,
      from: link.from,
      to: link.to,
      kind: (link.kind ?? 'reference') as GraphEdgeKind,
      metadata: link.metadata,
      sources: [],
    })),
  };
}

export function createOwnedGraphPluginForces(): OwnedGraphPluginForces {
  const installed = new Map<string, InstalledForceAdapter>();

  return {
    active: () => installed.size > 0,
    sync(contributions, graphData, physicsSettings) {
      const active = new Set<string>();
      const signature = contextSignature(physicsSettings);
      const graph = visibleGraph(graphData);
      let changed = false;

      for (const entry of contributions?.forces ?? []) {
        const key = namespace(entry.pluginId, entry.contribution.id);
        active.add(key);
        const current = installed.get(key);
        if (
          current?.contribution === entry.contribution
          && current.nodes === graphData.nodes
          && current.contextSignature === signature
        ) continue;
        current?.adapter.dispose();
        const adapter = entry.contribution.create({
          nodes: graphData.nodes,
          edges: graph.edges,
          visibleGraph: graph,
          physicsSettings,
        });
        adapter.initialize?.(graphData.nodes);
        installed.set(key, {
          adapter,
          contribution: entry.contribution,
          contextSignature: signature,
          nodes: graphData.nodes,
        });
        changed = true;
      }

      for (const [key, current] of installed) {
        if (active.has(key)) continue;
        current.adapter.dispose();
        installed.delete(key);
        changed = true;
      }
      return changed;
    },
    tick(alpha) {
      for (const current of installed.values()) current.adapter.tick?.(alpha);
    },
    dispose() {
      for (const current of installed.values()) current.adapter.dispose();
      installed.clear();
    },
  };
}
