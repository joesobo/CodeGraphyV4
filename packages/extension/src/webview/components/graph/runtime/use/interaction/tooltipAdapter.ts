import type { GraphTooltipInteractionDependencies } from '../tooltip/hook';
import type { GraphInteractionHandlersRuntime } from './contracts';

export function buildTooltipInteractionHandlers(
  interactionHandlers: GraphInteractionHandlersRuntime,
): GraphTooltipInteractionDependencies {
  return {
    sendGraphInteraction: interactionHandlers.sendGraphInteraction,
    setGraphCursor: interactionHandlers.setGraphCursor,
  };
}
