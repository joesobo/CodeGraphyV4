import { createHash } from 'node:crypto';

import type { IGraphData } from '@codegraphy-dev/plugin-api';

const HASH_FORMAT = 'codegraphy-benchmark-graph-v1';

function canonicalize(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalize(entryValue)}`)
      .join(',')}}`;
  }

  throw new Error(`Cannot hash fixture value of type ${typeof value}`);
}

export function hashGraphFixture(graph: IGraphData): string {
  const hash = createHash('sha256');
  hash.update(`${HASH_FORMAT}\n`);
  hash.update(`nodes:${graph.nodes.length}\n`);
  graph.nodes.forEach((node) => hash.update(`${canonicalize(node)}\n`));
  hash.update(`edges:${graph.edges.length}\n`);
  graph.edges.forEach((edge) => hash.update(`${canonicalize(edge)}\n`));
  return `sha256:${hash.digest('hex')}`;
}
