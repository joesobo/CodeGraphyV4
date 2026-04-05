import type {
  GraphInteractionEffect,
  GraphModifierClickOptions,
} from './model';

function isMacControlContextAction(
  ctrlKey: boolean,
  isMacPlatform: boolean,
): boolean {
  return isMacPlatform && ctrlKey;
}

export function getBackgroundClickCommand(
  options: GraphModifierClickOptions,
): GraphInteractionEffect[] {
  if (isMacControlContextAction(options.ctrlKey, options.isMacPlatform)) {
    return [{ kind: 'openBackgroundContextMenu' }];
  }

  return [
    { kind: 'clearSelection' },
    { kind: 'clearFocusedFile' },
    { kind: 'sendInteraction', event: 'graph:backgroundClick', payload: {} },
  ];
}

export function getLinkClickCommand(
  options: GraphModifierClickOptions,
): GraphInteractionEffect[] {
  return isMacControlContextAction(options.ctrlKey, options.isMacPlatform)
    ? [{ kind: 'openEdgeContextMenu' }]
    : [];
}
