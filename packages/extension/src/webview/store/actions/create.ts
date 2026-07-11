import { createDisplayActions } from './display';
import { createBootstrapActions } from './bootstrap';
import { createExtensionMessageActions } from './messages';
import { createOptimisticLegendActions } from './optimisticLegends';
import { createScalarActions } from './scalars';
import { createInlineEditActions } from './inlineEdit';
import type { GetState, SetState } from './types';

export function createActions(set: SetState, get: GetState) {
  return {
    ...createDisplayActions(set),
    ...createScalarActions(set),
    ...createBootstrapActions(set),
    ...createOptimisticLegendActions(set),
    ...createInlineEditActions(set),
    ...createExtensionMessageActions(set, get),
  };
}
