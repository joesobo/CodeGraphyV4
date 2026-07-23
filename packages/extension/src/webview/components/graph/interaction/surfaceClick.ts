import type {
  GraphInteractionEffect,
  GraphModifierClickOptions,
} from './model';
import { isMacControlClick } from '../support/modifiers';

export function getBackgroundClickCommand(
  options: GraphModifierClickOptions,
): GraphInteractionEffect[] {
  if (isMacControlClick(options.ctrlKey, options.isMacPlatform)) {
    return [{ kind: 'openBackgroundContextMenu' }];
  }

  return [
    { kind: 'clearSelection' },
    { kind: 'clearFocusedFile' },
  ];
}

export function getLinkClickCommand(
  options: GraphModifierClickOptions,
): GraphInteractionEffect[] {
  return isMacControlClick(options.ctrlKey, options.isMacPlatform)
    ? [{ kind: 'openEdgeContextMenu' }]
    : [];
}
