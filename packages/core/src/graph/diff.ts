import { isDeepStrictEqual } from 'node:util';
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
const graphNodeSchema = z.looseObject({
  id: nonemptyId,
  label: z.string(),
  color: z.string(),
}) as z.ZodType<IGraphNode>;
const graphEdgeSourceSchema = z.looseObject({
  id: nonemptyId,
  pluginId: nonemptyId,
  sourceId: nonemptyId,
  label: z.string(),
});
const graphEdgeSchema = z.looseObject({
  id: nonemptyId,
  from: nonemptyId,
  to: nonemptyId,
  kind: nonemptyId,
  sources: z.array(graphEdgeSourceSchema),
}) as z.ZodType<IGraphEdge>;

export const graphDataPatchSchema: z.ZodType<GraphDataPatch> = z.object({
  addedNodes: z.array(graphNodeSchema),
  removedNodeIds: z.array(nonemptyId),
  updatedNodes: z.array(graphNodeSchema),
  addedLinks: z.array(graphEdgeSchema),
  removedLinkIds: z.array(nonemptyId),
}).superRefine((patch, context) => {
  validatePatchIds(
    [
      ['addedNodes', patch.addedNodes.map(node => node.id)],
      ['updatedNodes', patch.updatedNodes.map(node => node.id)],
      ['removedNodeIds', patch.removedNodeIds],
    ],
    true,
    context,
  );
  validatePatchIds(
    [
      ['addedLinks', patch.addedLinks.map(link => link.id)],
      ['removedLinkIds', patch.removedLinkIds],
    ],
    true,
    context,
  );
});

export function diffGraphData(previous: IGraphData, next: IGraphData): GraphDataPatch {
  assertUniqueGraphIds(previous);
  assertUniqueGraphIds(next);

  const nodePatch = diffCollection(previous.nodes, next.nodes);
  const linkPatch = diffCollection(previous.edges, next.edges);
  const addedLinkIds = new Set([...linkPatch.added, ...linkPatch.updated].map(link => link.id));
  const removedLinkIds = new Set([...linkPatch.removedIds, ...linkPatch.updated.map(link => link.id)]);

  return {
    addedNodes: nodePatch.added,
    removedNodeIds: nodePatch.removedIds,
    updatedNodes: nodePatch.updated,
    addedLinks: next.edges.filter(link => addedLinkIds.has(link.id)),
    removedLinkIds: previous.edges.filter(link => removedLinkIds.has(link.id)).map(link => link.id),
  };
}

export function applyGraphDataPatchInPlace(
  graphData: IGraphData,
  input: GraphDataPatch,
): IGraphData {
  const patch = graphDataPatchSchema.parse(input);
  validateCollectionPatchOperations(
    graphData.nodes,
    patch.removedNodeIds,
    patch.updatedNodes,
    patch.addedNodes,
  );
  validateCollectionPatchOperations(
    graphData.edges,
    patch.removedLinkIds,
    [],
    patch.addedLinks,
  );
  applyCollectionPatchInPlace(
    graphData.nodes,
    patch.removedNodeIds,
    patch.updatedNodes,
    patch.addedNodes,
  );
  applyCollectionPatchInPlace(
    graphData.edges,
    patch.removedLinkIds,
    [],
    patch.addedLinks,
  );
  return graphData;
}

interface Identified { id: string }

function validateCollectionPatchOperations<T extends Identified>(
  values: readonly T[],
  removedIds: readonly string[],
  updates: readonly T[],
  additions: readonly T[],
): void {
  const existing = new Set(values.map(value => value.id));
  const removed = new Set(removedIds);
  for (const update of updates) {
    if (!existing.has(update.id) || removed.has(update.id)) {
      throw new Error(`Cannot update missing graph item: ${update.id}`);
    }
  }
  for (const addition of additions) {
    if (existing.has(addition.id) && !removed.has(addition.id)) {
      throw new Error(`Cannot add existing graph item: ${addition.id}`);
    }
  }
}

function diffCollection<T extends Identified>(
  previous: readonly T[],
  next: readonly T[],
): { added: T[]; removedIds: string[]; updated: T[] } {
  const previousById = new Map(previous.map(value => [value.id, value]));
  const nextById = new Map(next.map(value => [value.id, value]));

  const updated: T[] = [];
  const added: T[] = [];
  for (const value of next) {
    const previousValue = previousById.get(value.id);
    if (!previousValue) added.push(value);
    else if (!isDeepStrictEqual(previousValue, value)) updated.push(value);
  }

  return {
    added,
    removedIds: previous.filter(value => !nextById.has(value.id)).map(value => value.id),
    updated,
  };
}

function applyCollectionPatchInPlace<T extends Identified>(
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

function replaceObjectInPlace<T extends Identified>(current: T, replacement: T): void {
  const mutable = current as Record<string, unknown>;
  for (const key of Object.keys(current)) {
    if (!(key in replacement)) delete mutable[key];
  }
  Object.assign(current, replacement);
}

function assertUniqueGraphIds(graphData: IGraphData): void {
  assertUniqueIds('node', graphData.nodes.map(node => node.id));
  assertUniqueIds('link', graphData.edges.map(link => link.id));
}

function assertUniqueIds(kind: string, ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Duplicate graph ${kind} id: ${id}`);
    seen.add(id);
  }
}

function validatePatchIds(
  groups: ReadonlyArray<readonly [string, readonly string[]]>,
  allowCrossGroupReplacement: boolean,
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
        && allowCrossGroupReplacement
        && !owner.includes('updated')
        && !group.includes('updated');
      if (owner && !isReplacement) {
        context.addIssue({ code: 'custom', message: `Conflicting patch id ${id}: ${owner}/${group}` });
      }
      owners.set(id, group);
    }
  }
}
