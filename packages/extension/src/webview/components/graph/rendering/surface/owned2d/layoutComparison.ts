import type { GraphLayoutEngine, GraphLayoutInput } from '@codegraphy-dev/graph-renderer';
import type { OwnedGraphLayoutInput } from './layoutData';

function sameBuffer(first: ArrayLike<number>, second: ArrayLike<number>): boolean {
  if (first.length !== second.length) return false;
  for (let index = 0; index < first.length; index += 1) if (!Object.is(first[index], second[index])) return false;
  return true;
}

export function sameOwnedGraphShape(engine: GraphLayoutEngine, input: OwnedGraphLayoutInput): boolean {
  return sameTopology(engine, input)
    && sameBuffer(engine.chargeStrengthMultipliers, input.chargeStrengthMultipliers)
    && sameBuffer(engine.radii, input.radii)
    && sameBuffer(engine.flags, input.flags);
}

function sameTopology(engine: GraphLayoutEngine, input: GraphLayoutInput): boolean {
  return sameBuffer(engine.edgeSources, input.edgeSources)
    && sameBuffer(engine.edgeTargets, input.edgeTargets)
    && engine.nodeIds.length === input.nodeIds.length
    && engine.nodeIds.every((id, index) => id === input.nodeIds[index]);
}
