import type { IGraphEdge, IGraphNode } from '../../../graph/contracts';
import type { GraphEdgeRow, GraphNodeRow } from './contracts';
import { parseOptionalJson, readRequiredString } from './values';

export function createSnapshotGraphNode(row: GraphNodeRow): IGraphNode | undefined {
  const id = readRequiredString(row.id);
  const nodeType = readRequiredString(row.type);
  const label = readRequiredString(row.label);
  if (!id || !nodeType || !label) return undefined;

  const properties = parseOptionalJson<Record<string, unknown>>(row.propertiesJson) ?? {};
  return {
    ...properties,
    id,
    label,
    nodeType,
    color: typeof properties.color === 'string' ? properties.color : '#808080',
  } as IGraphNode;
}

export function createSnapshotGraphEdge(row: GraphEdgeRow): IGraphEdge | undefined {
  const id = readRequiredString(row.id);
  const from = readRequiredString(row.sourceId);
  const to = readRequiredString(row.targetId);
  const kind = readRequiredString(row.type);
  if (!id || !from || !to || !kind) return undefined;

  const properties = parseOptionalJson<Record<string, unknown>>(row.propertiesJson) ?? {};
  const sources = parseOptionalJson<IGraphEdge['sources']>(row.provenanceJson) ?? [];
  return { ...properties, id, from, to, kind, sources } as IGraphEdge;
}
