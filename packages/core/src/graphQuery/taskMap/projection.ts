import type {
  GraphEdgeKind,
  IGraphEdge,
  IGraphNode,
} from '../../graph/contracts';
import type { GraphQueryData } from '../data';
import type { GraphQueryTaskMapFile, GraphQueryTaskMapReport } from '../model';

const MAX_SYMBOLS_PER_FILE = 3;
const RELATIONSHIP_KEY_SEPARATOR = '\u0000';

type TaskMapRelationship = GraphQueryTaskMapReport['relationships'][number];

interface FilePair {
  from: string;
  to: string;
}

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

function selectedFilePair(
  edge: IGraphEdge,
  nodes: ReadonlyMap<string, IGraphNode>,
  selectedPaths: ReadonlySet<string>,
): FilePair | undefined {
  if (edge.kind === 'contains') return undefined;
  const from = filePathForNode(nodes.get(edge.from));
  const to = filePathForNode(nodes.get(edge.to));
  if (!from || !to || from === to || !selectedPaths.has(from) || !selectedPaths.has(to)) {
    return undefined;
  }
  return { from, to };
}

function addWeightedLink(
  links: ReadonlyMap<string, Map<string, number>>,
  from: string,
  to: string,
  weight: number,
): void {
  const neighbors = links.get(from);
  neighbors?.set(to, (neighbors.get(to) ?? 0) + weight);
}

export function createTaskMapFileLinks(
  data: GraphQueryData,
  filePaths: ReadonlySet<string>,
): Map<string, Map<string, number>> {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const links = new Map([...filePaths].map(filePath => [filePath, new Map<string, number>()]));
  for (const edge of data.graphData.edges) {
    const pair = selectedFilePair(edge, nodes, filePaths);
    if (!pair) continue;
    const weight = edgeWeight(edge.kind);
    addWeightedLink(links, pair.from, pair.to, weight);
    addWeightedLink(links, pair.to, pair.from, weight);
  }
  return links;
}

function taskMapSymbol(
  symbol: NonNullable<GraphQueryData['symbols']>[number],
): GraphQueryTaskMapFile['symbols'][number] {
  return {
    ...(symbol.id ? { id: symbol.id } : {}),
    name: symbol.name,
    ...(symbol.kind ? { kind: symbol.kind } : {}),
  };
}

function limitTaskMapSymbols(symbols: GraphQueryTaskMapFile['symbols']): GraphQueryTaskMapFile['symbols'] {
  return symbols
    .sort((left, right) => left.name.localeCompare(right.name) || (left.id ?? '').localeCompare(right.id ?? ''))
    .slice(0, MAX_SYMBOLS_PER_FILE);
}

export function indexTaskMapSymbols(data: GraphQueryData): Map<string, GraphQueryTaskMapFile['symbols']> {
  const symbols = new Map<string, GraphQueryTaskMapFile['symbols']>();
  for (const symbol of data.symbols ?? []) {
    const fileSymbols = symbols.get(symbol.filePath) ?? [];
    fileSymbols.push(taskMapSymbol(symbol));
    symbols.set(symbol.filePath, fileSymbols);
  }
  for (const [filePath, fileSymbols] of symbols) {
    symbols.set(filePath, limitTaskMapSymbols(fileSymbols));
  }
  return symbols;
}

function addRelationshipKind(
  grouped: Map<string, Set<GraphEdgeKind>>,
  pair: FilePair,
  kind: GraphEdgeKind,
): void {
  const key = `${pair.from}${RELATIONSHIP_KEY_SEPARATOR}${pair.to}`;
  const kinds = grouped.get(key) ?? new Set<GraphEdgeKind>();
  kinds.add(kind);
  grouped.set(key, kinds);
}

function taskMapRelationships(grouped: ReadonlyMap<string, Set<GraphEdgeKind>>): TaskMapRelationship[] {
  return [...grouped].map(([key, kinds]) => {
    const [from = '', to = ''] = key.split(RELATIONSHIP_KEY_SEPARATOR);
    return { from, to, edgeTypes: [...kinds].sort() };
  }).sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to));
}

export function selectTaskMapRelationships(
  data: GraphQueryData,
  selectedPaths: ReadonlySet<string>,
  limit: number,
): { relationships: GraphQueryTaskMapReport['relationships']; complete: boolean } {
  const nodes = new Map(data.graphData.nodes.map(node => [node.id, node]));
  const grouped = new Map<string, Set<GraphEdgeKind>>();
  for (const edge of data.graphData.edges) {
    const pair = selectedFilePair(edge, nodes, selectedPaths);
    if (pair) addRelationshipKind(grouped, pair, edge.kind);
  }
  const all = taskMapRelationships(grouped);
  return { relationships: all.slice(0, limit), complete: all.length <= limit };
}
