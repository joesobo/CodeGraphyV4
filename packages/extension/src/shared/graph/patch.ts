import { z } from 'zod';
import type { IGraphData, IGraphEdge, IGraphNode } from './contracts';

export interface GraphDataPatch {
  addedNodes: IGraphNode[];
  removedNodeIds: string[];
  updatedNodes: IGraphNode[];
  addedLinks: IGraphEdge[];
  removedLinkIds: string[];
}

const nonemptyId = z.string().min(1);
const nodeSchema = z.looseObject({
  id: nonemptyId,
  label: z.string(),
  color: z.string(),
}) as z.ZodType<IGraphNode>;
const sourceSchema = z.looseObject({
  id: nonemptyId,
  pluginId: nonemptyId,
  sourceId: nonemptyId,
  label: z.string(),
});
const linkSchema = z.looseObject({
  id: nonemptyId,
  from: nonemptyId,
  to: nonemptyId,
  kind: nonemptyId,
  sources: z.array(sourceSchema),
}) as z.ZodType<IGraphEdge>;

export const graphDataPatchSchema: z.ZodType<GraphDataPatch> = z.object({
  addedNodes: z.array(nodeSchema),
  removedNodeIds: z.array(nonemptyId),
  updatedNodes: z.array(nodeSchema),
  addedLinks: z.array(linkSchema),
  removedLinkIds: z.array(nonemptyId),
}).superRefine((patch, context) => {
  validatePatchIds([
    ['addedNodes', patch.addedNodes.map(node => node.id)],
    ['updatedNodes', patch.updatedNodes.map(node => node.id)],
    ['removedNodeIds', patch.removedNodeIds],
  ], context);
  validatePatchIds([
    ['addedLinks', patch.addedLinks.map(link => link.id)],
    ['removedLinkIds', patch.removedLinkIds],
  ], context);
});

export function applyGraphDataPatchInPlace(
  graphData: IGraphData,
  patch: GraphDataPatch,
): IGraphData {
  validateCollectionPatch(
    graphData.nodes,
    patch.removedNodeIds,
    patch.updatedNodes,
    patch.addedNodes,
  );
  validateCollectionPatch(
    graphData.edges,
    patch.removedLinkIds,
    [],
    patch.addedLinks,
  );
  applyCollectionPatch(
    graphData.nodes,
    patch.removedNodeIds,
    patch.updatedNodes,
    patch.addedNodes,
  );
  applyCollectionPatch(
    graphData.edges,
    patch.removedLinkIds,
    [],
    patch.addedLinks,
  );
  return graphData;
}

function validateCollectionPatch<T extends { id: string }>(
  values: readonly T[],
  removedIds: readonly string[],
  updates: readonly T[],
  additions: readonly T[],
): void {
  const existing = new Set(values.map(value => value.id));
  const removed = new Set(removedIds);
  const additionsSeen = new Set<string>();
  for (const update of updates) {
    if (!existing.has(update.id) || removed.has(update.id)) {
      throw new Error(`Cannot update missing graph item: ${update.id}`);
    }
  }
  for (const addition of additions) {
    if (additionsSeen.has(addition.id) || (existing.has(addition.id) && !removed.has(addition.id))) {
      throw new Error(`Cannot add existing graph item: ${addition.id}`);
    }
    additionsSeen.add(addition.id);
  }
}

function applyCollectionPatch<T extends { id: string }>(
  values: T[],
  removedIds: readonly string[],
  updates: readonly T[],
  additions: readonly T[],
): void {
  const removed = new Set(removedIds);
  const retained = values.filter(value => !removed.has(value.id));
  values.splice(0, values.length, ...retained);

  const byId = new Map(values.map(value => [value.id, value]));
  for (const update of updates) {
    const current = byId.get(update.id);
    if (!current) throw new Error(`Cannot update missing graph item: ${update.id}`);
    replaceObjectInPlace(current, update);
  }
  for (const addition of additions) {
    if (byId.has(addition.id)) throw new Error(`Cannot add existing graph item: ${addition.id}`);
    values.push(addition);
    byId.set(addition.id, addition);
  }
}

function replaceObjectInPlace<T extends { id: string }>(current: T, replacement: T): void {
  const mutable = current as Record<string, unknown>;
  for (const key of Object.keys(current)) {
    if (!(key in replacement)) delete mutable[key];
  }
  Object.assign(current, replacement);
}

function validatePatchIds(
  groups: ReadonlyArray<readonly [string, readonly string[]]>,
  context: z.RefinementCtx,
): void {
  const owners = new Map<string, string>();
  for (const [group, ids] of groups) {
    const local = new Set<string>();
    for (const id of ids) {
      if (local.has(id)) {
        context.addIssue({ code: 'custom', message: `Duplicate ${group} id: ${id}` });
      }
      local.add(id);
      const owner = owners.get(id);
      const isReplacement = owner !== undefined
        && !owner.includes('updated')
        && !group.includes('updated');
      if (owner && !isReplacement) {
        context.addIssue({ code: 'custom', message: `Conflicting patch id ${id}: ${owner}/${group}` });
      }
      owners.set(id, group);
    }
  }
}
