import type { GraphInteractionHandlersDependencies } from '../handlers';
import { fitGraphView } from '../fit/api/view';
import { focusNodeById } from './view/focus';
import { panToNodeById } from './view/pan';
import { zoomGraphView } from './view/zoom';

export interface ViewHandlers {
  fitView(this: void): void;
  focusNodeById(this: void, nodeId: string): void;
  panToNodeById(this: void, nodeId: string): void;
  zoomGraphView(this: void, factor: number): void;
}

export function createViewHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): ViewHandlers {
  return {
    fitView: () => fitGraphView(dependencies),
    focusNodeById: (nodeId: string) => focusNodeById(dependencies, nodeId),
    panToNodeById: (nodeId: string) => panToNodeById(dependencies, nodeId),
    zoomGraphView: (factor: number) => zoomGraphView(dependencies, factor),
  };
}
