import type { GraphDataPatch } from '../../../../../shared/graph/patch';

const DEFAULT_GRAPH_HYDRATION_CHUNK_SIZE = 500;

function emptyPatch(): GraphDataPatch {
  return {
    addedLinks: [],
    addedNodes: [],
    removedLinkIds: [],
    removedNodeIds: [],
    updatedNodes: [],
  };
}

function appendChunks<T>(
  chunks: GraphDataPatch[],
  values: readonly T[],
  key: keyof GraphDataPatch,
  chunkSize: number,
): void {
  for (let offset = 0; offset < values.length; offset += chunkSize) {
    const chunk = emptyPatch();
    (chunk[key] as T[]) = values.slice(offset, offset + chunkSize);
    chunks.push(chunk);
  }
}

export function chunkGraphDataPatch(
  patch: GraphDataPatch,
  chunkSize = DEFAULT_GRAPH_HYDRATION_CHUNK_SIZE,
): GraphDataPatch[] {
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('Graph hydration chunk size must be a positive integer');
  }

  const chunks: GraphDataPatch[] = [];
  appendChunks(chunks, patch.removedLinkIds, 'removedLinkIds', chunkSize);
  appendChunks(chunks, patch.removedNodeIds, 'removedNodeIds', chunkSize);
  appendChunks(chunks, patch.updatedNodes, 'updatedNodes', chunkSize);
  appendChunks(chunks, patch.addedNodes, 'addedNodes', chunkSize);
  appendChunks(chunks, patch.addedLinks, 'addedLinks', chunkSize);
  return chunks;
}
