import type {
  IGraphData,
  IGraphEdge,
  IGraphNode,
} from '@codegraphy-dev/plugin-api';

export interface SyntheticFixtureOptions {
  nodeCount: number;
  seed: number;
}

const FILES_PER_PACKAGE = 128;
const ORPHAN_INTERVAL = 50;
const LOCAL_TARGET_PROBABILITY = 0.78;
const REVERSE_EDGE_PROBABILITY = 0.025;
const MAX_OUTGOING_EDGES = 12;

type Random = () => number;

function createRandom(seed: number): Random {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function packageIndexFor(nodeIndex: number): number {
  return Math.floor(nodeIndex / FILES_PER_PACKAGE);
}

function createNode(index: number): IGraphNode {
  const packageName = `package-${packageIndexFor(index).toString().padStart(4, '0')}`;
  const fileName = `file-${index.toString().padStart(6, '0')}.ts`;

  return {
    id: `packages/${packageName}/src/${fileName}`,
    label: fileName,
    color: '#67E8F9',
    nodeType: 'file',
  };
}

function drawOutgoingCount(random: Random): number {
  const geometric = 1 + Math.floor(Math.log(1 - random()) / Math.log(0.68));
  return Math.min(MAX_OUTGOING_EDGES, geometric);
}

function chooseTarget(
  globalTickets: readonly number[],
  localTickets: readonly number[],
  random: Random,
): number {
  const tickets = localTickets.length > 0 && random() < LOCAL_TARGET_PROBABILITY
    ? localTickets
    : globalTickets;
  return tickets[Math.floor(random() * tickets.length)];
}

function createEdge(from: IGraphNode, to: IGraphNode): IGraphEdge {
  return {
    id: `${from.id}->${to.id}#import`,
    from: from.id,
    to: to.id,
    kind: 'import',
    sources: [],
  };
}

function isReservedOrphan(index: number): boolean {
  return index % ORPHAN_INTERVAL === ORPHAN_INTERVAL - 1;
}

export function generateSyntheticGraph(options: SyntheticFixtureOptions): IGraphData {
  if (!Number.isInteger(options.nodeCount) || options.nodeCount < 0) {
    throw new Error('nodeCount must be a non-negative integer');
  }

  const nodes = Array.from({ length: options.nodeCount }, (_, index) => createNode(index));
  const edges: IGraphEdge[] = [];
  const globalTickets: number[] = [];
  const localTickets = new Map<number, number[]>();
  const random = createRandom(options.seed);

  const addTickets = (nodeIndex: number, count: number): void => {
    const packageIndex = packageIndexFor(nodeIndex);
    const packageTickets = localTickets.get(packageIndex) ?? [];
    if (!localTickets.has(packageIndex)) localTickets.set(packageIndex, packageTickets);

    for (let ticket = 0; ticket < count; ticket += 1) {
      globalTickets.push(nodeIndex);
      packageTickets.push(nodeIndex);
    }
  };

  nodes.forEach((source, sourceIndex) => {
    if (isReservedOrphan(sourceIndex)) return;

    if (globalTickets.length === 0) {
      addTickets(sourceIndex, 1);
      return;
    }

    const packageTickets = localTickets.get(packageIndexFor(sourceIndex)) ?? [];
    const targets = new Set<number>();
    const targetCount = drawOutgoingCount(random);
    const maximumAttempts = targetCount * 12;

    for (let attempt = 0; targets.size < targetCount && attempt < maximumAttempts; attempt += 1) {
      targets.add(chooseTarget(globalTickets, packageTickets, random));
    }

    targets.forEach((targetIndex) => {
      const target = nodes[targetIndex];
      edges.push(createEdge(source, target));
      addTickets(targetIndex, 1);

      if (random() < REVERSE_EDGE_PROBABILITY) {
        edges.push(createEdge(target, source));
        addTickets(sourceIndex, 1);
      }
    });

    addTickets(sourceIndex, 1 + targets.size);
  });

  return { nodes, edges };
}
