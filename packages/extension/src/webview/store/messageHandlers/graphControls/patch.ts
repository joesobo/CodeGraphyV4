import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { PartialState } from '../../messageTypes';
import { arePlainValuesEqual } from '../equality/compare';

type GraphControlsPayload = Extract<
  ExtensionToWebviewMessage,
  { type: 'GRAPH_CONTROLS_UPDATED' }
>['payload'];

export function createGraphControlsStatePatch(
  state: PartialState,
  payload: GraphControlsPayload,
): PartialState {
  const next: PartialState = {};

  assignChangedGraphControl(next, 'graphNodeTypes', state.graphNodeTypes, payload.nodeTypes);
  assignChangedGraphControl(next, 'graphEdgeTypes', state.graphEdgeTypes, payload.edgeTypes);
  assignChangedGraphControl(next, 'nodeColors', state.nodeColors, payload.nodeColors);
  assignChangedGraphControl(next, 'nodeVisibility', state.nodeVisibility, payload.nodeVisibility);
  assignChangedGraphControl(next, 'edgeVisibility', state.edgeVisibility, payload.edgeVisibility);
  if (next.nodeVisibility || next.edgeVisibility) {
    next.graphScopeProjectionRevision = (state.graphScopeProjectionRevision ?? 0) + 1;
  }

  return next;
}

function assignChangedGraphControl<K extends keyof PartialState>(
  next: PartialState,
  key: K,
  currentValue: PartialState[K],
  nextValue: PartialState[K],
): void {
  if (!arePlainValuesEqual(currentValue, nextValue)) {
    next[key] = nextValue;
  }
}
