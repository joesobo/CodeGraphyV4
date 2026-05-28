import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IPhysicsSettings } from '../../../../../shared/settings/physics';
import type { GraphEdgeKind, IGraphData } from '../../../../../shared/graph/contracts';
import type { FGLink, FGNode } from '../../model/build';
import type { GraphPhysicsControls } from './model';

interface GraphViewForceAdapter {
  initialize?(nodes: FGNode[]): void;
  tick?(alpha?: number): void;
  dispose(): void;
}

interface InstalledForceAdapter {
  adapter: GraphViewForceAdapter;
  contribution: CoreGraphViewContributionSet['forces'][number]['contribution'];
  contextSignature: string;
  nodes: readonly FGNode[];
}

export interface GraphViewForceAdapterState {
  installed: Map<string, InstalledForceAdapter>;
}

export interface GraphViewForceSyncContext {
  graphMode?: '2d' | '3d';
  physicsSettings?: IPhysicsSettings;
  timelineActive?: boolean;
}

export function createGraphViewForceAdapterState(): GraphViewForceAdapterState {
  return {
    installed: new Map(),
  };
}

function createGraphViewForceNamespace(pluginId: string, contributionId: string): string {
  return `plugin:${pluginId}:${contributionId}`;
}

function createD3Force(adapter: GraphViewForceAdapter): ((alpha: number) => void) & {
  initialize(nodes: FGNode[]): void;
} {
  const force = (alpha: number): void => {
    adapter.tick?.(alpha);
  };
  force.initialize = (nodes: FGNode[]): void => {
    adapter.initialize?.(nodes);
  };
  return force;
}

function getGraphEdgeKind(link: FGLink): GraphEdgeKind {
  return (link.kind ?? 'reference') as GraphEdgeKind;
}

function createGraphViewForceContextSignature(context: GraphViewForceSyncContext): string {
  const settings = context.physicsSettings;
  return [
    context.graphMode ?? '',
    context.timelineActive === true ? '1' : '0',
    settings?.repelForce ?? '',
    settings?.linkDistance ?? '',
    settings?.linkForce ?? '',
    settings?.damping ?? '',
    settings?.centerForce ?? '',
  ].join(':');
}

function createVisibleGraph(graphData: { nodes: FGNode[]; links: FGLink[] }): IGraphData {
  return {
    nodes: graphData.nodes,
    edges: graphData.links.map(link => ({
      id: link.id,
      from: link.from,
      to: link.to,
      kind: getGraphEdgeKind(link),
      metadata: link.metadata,
      sources: [],
    })),
  };
}

export function syncGraphViewForceAdapters(
  graph: GraphPhysicsControls,
  state: GraphViewForceAdapterState,
  contributions: CoreGraphViewContributionSet | undefined,
  graphData: { nodes: FGNode[]; links: FGLink[] },
  context: GraphViewForceSyncContext = {},
): void {
  const activeNamespaces = new Set<string>();
  const visibleGraph = createVisibleGraph(graphData);
  const contextSignature = createGraphViewForceContextSignature(context);

  for (const entry of contributions?.forces ?? []) {
    const namespace = createGraphViewForceNamespace(entry.pluginId, entry.contribution.id);
    activeNamespaces.add(namespace);

    const installed = state.installed.get(namespace);
    if (
      installed?.contribution === entry.contribution
      && installed.nodes === graphData.nodes
      && installed.contextSignature === contextSignature
    ) {
      continue;
    }

    if (installed) {
      installed.adapter.dispose();
      graph.d3Force(namespace, null);
    }

    const adapter = entry.contribution.create({
      nodes: graphData.nodes,
      edges: visibleGraph.edges,
      visibleGraph,
      ...context,
    }) as GraphViewForceAdapter;
    state.installed.set(namespace, {
      adapter,
      contribution: entry.contribution,
      contextSignature,
      nodes: graphData.nodes,
    });
    graph.d3Force(namespace, createD3Force(adapter));
    graph.d3ReheatSimulation();
  }

  for (const [namespace, installed] of state.installed) {
    if (activeNamespaces.has(namespace)) {
      continue;
    }

    installed.adapter.dispose();
    graph.d3Force(namespace, null);
    state.installed.delete(namespace);
    graph.d3ReheatSimulation();
  }
}
