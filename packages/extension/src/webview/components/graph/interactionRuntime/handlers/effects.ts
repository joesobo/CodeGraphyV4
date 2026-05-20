import { postMessage } from '../../../../vscodeApi';
import { applyInteractionEffects, type GraphInteractionOptions } from '../../effects/interaction';
import type { GraphInteractionEffect } from '../../interaction/model';
import type { FGLink } from '../../model/build';
import type { GraphInteractionHandlersDependencies } from '../handlers';

export interface EffectCallbackHandlers {
  clearSelection(this: void): void;
  focusNodeById(this: void, nodeId: string): void;
  openBackgroundContextMenu(this: void, event: MouseEvent): void;
  openEdgeContextMenu(this: void, link: FGLink, event: MouseEvent): void;
  openNodeContextMenu(this: void, nodeId: string, event: MouseEvent): void;
  selectOnlyNode(this: void, nodeId: string): void;
  setSelection(this: void, nodeIds: string[]): void;
}

export interface EffectHandlers {
  applyGraphInteractionEffects(
    this: void,
    effects: GraphInteractionEffect[],
    options?: GraphInteractionOptions<FGLink>,
  ): void;
  previewNode(this: void, nodeId: string): void;
  requestNodeOpenById(this: void, nodeId: string): void;
  sendGraphInteraction(this: void, event: string, eventData: unknown): void;
}

export function createEffectHandlers(
  dependencies: GraphInteractionHandlersDependencies,
  handlers: EffectCallbackHandlers,
): EffectHandlers {
  const sendGraphInteraction = (event: string, eventData: unknown): void => {
    postMessage({ type: 'GRAPH_INTERACTION', payload: { event, data: eventData } });
  };

  const previewNode = (nodeId: string): void => {
    postMessage({ type: 'NODE_SELECTED', payload: { nodeId } });
  };

  const clearFocusedFile = (): void => {
    postMessage({ type: 'CLEAR_FOCUSED_FILE' });
  };

  const requestNodeOpenById = (nodeId: string): void => {
    dependencies.fileInfoCacheRef.current.delete(nodeId);
    postMessage({ type: 'NODE_DOUBLE_CLICKED', payload: { nodeId } });
  };

  const applyGraphInteractionEffects = (
    effects: GraphInteractionEffect[],
    options: GraphInteractionOptions<FGLink> = {},
  ): void => {
    applyInteractionEffects(
      effects,
      {
        clearSelection: handlers.clearSelection,
        clearFocusedFile,
        focusNode: handlers.focusNodeById,
        openBackgroundContextMenu: handlers.openBackgroundContextMenu,
        openEdgeContextMenu: handlers.openEdgeContextMenu,
        openNode: requestNodeOpenById,
        openNodeContextMenu: handlers.openNodeContextMenu,
        previewNode,
        selectOnlyNode: handlers.selectOnlyNode,
        sendInteraction: sendGraphInteraction,
        setSelection: handlers.setSelection,
      },
      options,
    );
  };

  return {
    applyGraphInteractionEffects,
    previewNode,
    requestNodeOpenById,
    sendGraphInteraction,
  };
}
