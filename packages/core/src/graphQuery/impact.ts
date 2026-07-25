import type { IGraphNode } from '../graph/contracts';
import type { GraphQueryData } from './data';
import type {
  GraphQueryImpactConfig,
  GraphQueryImpactItem,
  GraphQueryImpactReport,
  GraphQueryTargetNotFoundReport,
} from './model';
import { toNodeReportItem } from './nodeReport';
import { paginate } from './pagination';

const MAX_VISITED_NODES = 2_000;

interface ImpactAccumulator {
  distance: number;
  edgeTypes: Set<GraphQueryImpactItem['edgeTypes'][number]>;
  node: IGraphNode;
}

function targetNotFound(target: string): GraphQueryTargetNotFoundReport {
  return {
    error: 'query_target_not_found',
    message: `No indexed Node or Symbol has the exact id: ${target}`,
  };
}

function fileNodeFor(node: IGraphNode, nodesById: ReadonlyMap<string, IGraphNode>): IGraphNode | undefined {
  if (node.nodeType === 'file') return node;
  const filePath = node.symbol?.filePath;
  return filePath ? nodesById.get(filePath) : undefined;
}

function impactReasonRank(edgeTypes: ReadonlySet<GraphQueryImpactItem['edgeTypes'][number]>): number {
  const ranks: Partial<Record<GraphQueryImpactItem['edgeTypes'][number], number>> = {
    call: 0,
    event: 0,
    inherit: 0,
    reference: 0,
    import: 1,
    include: 1,
    nests: 1,
    reexport: 1,
    using: 1,
    'type-import': 2,
  };
  return Math.min(...[...edgeTypes].map(edgeType => ranks[edgeType] ?? 1));
}

function startingNodeIds(target: IGraphNode, nodes: readonly IGraphNode[]): string[] {
  if (target.nodeType !== 'file') return [target.id];
  return [
    target.id,
    ...nodes.flatMap(node => node.symbol?.filePath === target.id ? [node.id] : []),
  ];
}

export function impactGraphTarget(
  data: GraphQueryData,
  config: GraphQueryImpactConfig,
): GraphQueryImpactReport | GraphQueryTargetNotFoundReport {
  const nodesById = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const target = nodesById.get(config.target);
  if (!target) return targetNotFound(config.target);
  const targetFilePath = fileNodeFor(target, nodesById)?.id;
  const incoming = new Map<string, typeof data.graphData.edges>();
  for (const edge of data.graphData.edges) {
    if (edge.kind === 'contains') continue;
    incoming.set(edge.to, [...(incoming.get(edge.to) ?? []), edge]);
  }

  const seeds = startingNodeIds(target, data.graphData.nodes);
  const visited = new Set(seeds);
  let frontier = seeds;
  let visitedNodes = 0;
  let complete = true;
  const impacted = new Map<string, ImpactAccumulator>();

  for (let distance = 1; distance <= config.maxDepth && frontier.length > 0; distance += 1) {
    const next = new Set<string>();
    for (const current of frontier) {
      for (const edge of incoming.get(current) ?? []) {
        const source = nodesById.get(edge.from);
        if (!source) continue;
        const sourceFile = fileNodeFor(source, nodesById);
        if (sourceFile && sourceFile.id !== targetFilePath) {
          const existing = impacted.get(sourceFile.id);
          if (!existing || distance < existing.distance) {
            impacted.set(sourceFile.id, {
              distance,
              edgeTypes: new Set([edge.kind]),
              node: sourceFile,
            });
          } else if (distance === existing.distance) {
            existing.edgeTypes.add(edge.kind);
          }
        }
        const nextIds = sourceFile
          ? [source.id, ...startingNodeIds(sourceFile, data.graphData.nodes)]
          : [source.id];
        for (const nextId of new Set(nextIds)) {
          if (visited.has(nextId)) continue;
          visited.add(nextId);
          next.add(nextId);
          visitedNodes += 1;
          if (visitedNodes >= MAX_VISITED_NODES) {
            complete = false;
            break;
          }
        }
        if (!complete) break;
      }
      if (!complete) break;
    }
    frontier = [...next].sort();
    if (!complete) break;
  }

  const ranked = [...impacted.values()]
    .sort((left, right) => (
      impactReasonRank(left.edgeTypes) - impactReasonRank(right.edgeTypes)
      || left.distance - right.distance
      || left.node.id.localeCompare(right.node.id)
    ))
    .map(item => ({
      ...toNodeReportItem(item.node),
      distance: item.distance,
      edgeTypes: [...item.edgeTypes].sort(),
    }));
  const page = paginate(ranked, config);

  return {
    target: toNodeReportItem(target),
    impacted: page.items,
    page: page.page,
    limits: {
      maxDepth: config.maxDepth,
      visitedNodes,
      complete,
    },
  };
}
