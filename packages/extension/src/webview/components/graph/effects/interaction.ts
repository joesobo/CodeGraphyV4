import type { GraphInteractionEffect } from '../interaction/model';

export interface GraphInteractionOptions<TLink = unknown> {
  event?: MouseEvent;
  link?: TLink;
}

export interface GraphInteractionEffectHandlers<TLink = unknown> {
  openNodeContextMenu(nodeId: string, event: MouseEvent): void;
  openBackgroundContextMenu(event: MouseEvent): void;
  openEdgeContextMenu(link: TLink, event: MouseEvent): void;
  selectOnlyNode(nodeId: string): void;
  setSelection(nodeIds: string[]): void;
  clearSelection(): void;
  clearFocusedFile(): void;
  previewNode(nodeId: string): void;
  openNode(nodeId: string): void;
  focusNode(nodeId: string): void;
  sendInteraction(
    event: 'graph:nodeClick' | 'graph:nodeDoubleClick' | 'graph:backgroundClick',
    payload: unknown
  ): void;
}

export function applyInteractionEffects<TLink = unknown>(
  effects: GraphInteractionEffect[],
  handlers: GraphInteractionEffectHandlers<TLink>,
  options: GraphInteractionOptions<TLink> = {}
): void {
  for (const effect of effects) {
    switch (effect.kind) {
      case 'openNodeContextMenu':
        if (options.event) {
          handlers.openNodeContextMenu(effect.nodeId, options.event);
        }
        break;
      case 'openBackgroundContextMenu':
        if (options.event) {
          handlers.openBackgroundContextMenu(options.event);
        }
        break;
      case 'openEdgeContextMenu':
        if (options.event && options.link) {
          handlers.openEdgeContextMenu(options.link, options.event);
        }
        break;
      case 'selectOnlyNode':
        handlers.selectOnlyNode(effect.nodeId);
        break;
      case 'setSelection':
        handlers.setSelection(effect.nodeIds);
        break;
      case 'clearSelection':
        handlers.clearSelection();
        break;
      case 'clearFocusedFile':
        handlers.clearFocusedFile();
        break;
      case 'previewNode':
        handlers.previewNode(effect.nodeId);
        break;
      case 'openNode':
        handlers.openNode(effect.nodeId);
        break;
      case 'focusNode':
        handlers.focusNode(effect.nodeId);
        break;
      case 'sendInteraction':
        handlers.sendInteraction(effect.event, effect.payload);
        break;
    }
  }
}
