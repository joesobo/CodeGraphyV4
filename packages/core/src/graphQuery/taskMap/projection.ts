import type { GraphEdgeKind, IGraphNode } from '../../graph/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQueryTaskMapFile, GraphQueryTaskMapReport } from '../model';

const MAX_SYMBOLS_PER_FILE = 3;

function filePathForNode(node: IGraphNode | undefined): string | undefined {
  if (!node) return undefined;
  if (node.nodeType === 'file' && !node.symbol) return node.id;
  return node.symbol?.filePath;
}

function edgeWeight(kind: GraphEdgeKind): number {
  if (kind === 'call' || kind === 'event' || kind === 'inherit' || kind === 'reference') return 3;
  if (kind === 'type-import') return 1;
  return 2;
}

export function createTaskMapFileLinks(
  data: GraphQueryData,
  filePaths: ReadonlySet<string>,
): Map<string, Map<string, number>> {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const links = new Map([...filePaths].map(filePath => [filePath, new Map<string, number>()]));
  for (const edge of data.graphData.edges) {
    if (edge.kind === 'contains') continue;
    const from = filePathForNode(nodes.get(edge.from));
    const to = filePathForNode(nodes.get(edge.to));
    if (!from || !to || from === to || !filePaths.has(from) || !filePaths.has(to)) continue;
    const weight = edgeWeight(edge.kind);
    const fromLinks = links.get(from);
    const toLinks = links.get(to);
    fromLinks?.set(to, (fromLinks.get(to) ?? 0) + weight);
    toLinks?.set(from, (toLinks.get(from) ?? 0) + weight);
  }
  return links;
}

export function indexTaskMapSymbols(data: GraphQueryData): Map<string, GraphQueryTaskMapFile['symbols']> {
  const symbols = new Map<string, GraphQueryTaskMapFile['symbols']>();
  for (const symbol of data.symbols ?? []) {
    const fileSymbols = symbols.get(symbol.filePath) ?? [];
    fileSymbols.push({
      ...(symbol.id ? { id: symbol.id } : {}),
      name: symbol.name,
      ...(symbol.kind ? { kind: symbol.kind } : {}),
    });
    symbols.set(symbol.filePath, fileSymbols);
  }
  for (const [filePath, fileSymbols] of symbols) {
    symbols.set(filePath, fileSymbols
      .sort((left, right) => left.name.localeCompare(right.name) || (left.id ?? '').localeCompare(right.id ?? ''))
      .slice(0, MAX_SYMBOLS_PER_FILE));
  }
  return symbols;
}

export function selectTaskMapRelationships(
  data: GraphQueryData,
  selectedPaths: ReadonlySet<string>,
  limit: number,
): { relationships: GraphQueryTaskMapReport['relationships']; complete: boolean } {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const grouped = new Map<string, Set<GraphEdgeKind>>();
  for (const edge of data.graphData.edges) {
    if (edge.kind === 'contains') continue;
    const from = filePathForNode(nodes.get(edge.from));
    const to = filePathForNode(nodes.get(edge.to));
    if (!from || !to || from === to || !selectedPaths.has(from) || !selectedPaths.has(to)) continue;
    const key = `${from}\u0000${to}`;
    const kinds = grouped.get(key) ?? new Set<GraphEdgeKind>();
    kinds.add(edge.kind);
    grouped.set(key, kinds);
  }
  const all = [...grouped].map(([key, kinds]) => {
    const [from = '', to = ''] = key.split('\u0000');
    return { from, to, edgeTypes: [...kinds].sort() };
  }).sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
  return { relationships: all.slice(0, limit), complete: all.length <= limit };
}
