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

type InteractionEffectHandler = (
  effect: GraphInteractionEffect,
  handlers: GraphInteractionEffectHandlers,
  options: GraphInteractionOptions,
) => void;

type NodeContextMenuEffect = Extract<GraphInteractionEffect, { kind: 'openNodeContextMenu' }>;
type SelectOnlyNodeEffect = Extract<GraphInteractionEffect, { kind: 'selectOnlyNode' }>;
type SetSelectionEffect = Extract<GraphInteractionEffect, { kind: 'setSelection' }>;
type PreviewNodeEffect = Extract<GraphInteractionEffect, { kind: 'previewNode' }>;
type OpenNodeEffect = Extract<GraphInteractionEffect, { kind: 'openNode' }>;
type FocusNodeEffect = Extract<GraphInteractionEffect, { kind: 'focusNode' }>;
type SendInteractionEffect = Extract<GraphInteractionEffect, { kind: 'sendInteraction' }>;

const INTERACTION_EFFECT_HANDLERS = {
  openNodeContextMenu: (effect, handlers, options) => {
    if (options.event) {
      handlers.openNodeContextMenu((effect as NodeContextMenuEffect).nodeId, options.event);
    }
  },
  openBackgroundContextMenu: (_effect, handlers, options) => {
    if (options.event) {
      handlers.openBackgroundContextMenu(options.event);
    }
  },
  openEdgeContextMenu: (_effect, handlers, options) => {
    if (options.event && options.link) {
      handlers.openEdgeContextMenu(options.link, options.event);
    }
  },
  selectOnlyNode: (effect, handlers) => {
    handlers.selectOnlyNode((effect as SelectOnlyNodeEffect).nodeId);
  },
  setSelection: (effect, handlers) => {
    handlers.setSelection((effect as SetSelectionEffect).nodeIds);
  },
  clearSelection: (_effect, handlers) => {
    handlers.clearSelection();
  },
  clearFocusedFile: (_effect, handlers) => {
    handlers.clearFocusedFile();
  },
  previewNode: (effect, handlers) => {
    handlers.previewNode((effect as PreviewNodeEffect).nodeId);
  },
  openNode: (effect, handlers) => {
    handlers.openNode((effect as OpenNodeEffect).nodeId);
  },
  focusNode: (effect, handlers) => {
    handlers.focusNode((effect as FocusNodeEffect).nodeId);
  },
  sendInteraction: (effect, handlers) => {
    const interactionEffect = effect as SendInteractionEffect;
    handlers.sendInteraction(interactionEffect.event, interactionEffect.payload);
  },
} satisfies Record<GraphInteractionEffect['kind'], InteractionEffectHandler>;

export function applyInteractionEffects<TLink = unknown>(
  effects: GraphInteractionEffect[],
  handlers: GraphInteractionEffectHandlers<TLink>,
  options: GraphInteractionOptions<TLink> = {}
): void {
  for (const effect of effects) {
    INTERACTION_EFFECT_HANDLERS[effect.kind](
      effect,
      handlers as GraphInteractionEffectHandlers,
      options as GraphInteractionOptions,
    );
  }
}
