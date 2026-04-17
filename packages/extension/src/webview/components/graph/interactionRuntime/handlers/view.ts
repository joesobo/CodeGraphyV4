import type { GraphInteractionHandlersDependencies } from '../handlers';
import { fitGraphView } from '../fit/view';
import { updateAccessCount } from './view/accessCount';
import { focusNodeById } from './view/focus';
import { zoom2d } from './view/zoom';

export interface ViewHandlers {
  fitView(this: void): void;
  focusNodeById(this: void, nodeId: string): void;
  updateAccessCount(this: void, nodeId: string, accessCount: number): void;
  zoom2d(this: void, factor: number): void;
}

export function createViewHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): ViewHandlers {
  return {
    fitView: () => fitGraphView(dependencies),
    focusNodeById: (nodeId: string) => focusNodeById(dependencies, nodeId),
    updateAccessCount: (nodeId: string, accessCount: number) =>
      updateAccessCount(dependencies, nodeId, accessCount),
    zoom2d: (factor: number) => zoom2d(dependencies, factor),
  };
}
