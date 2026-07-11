import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { PartialState } from '../messageTypes';

type HydrationMessage = Extract<
  ExtensionToWebviewMessage,
  { type: 'GRAPH_SCOPE_HYDRATION_UPDATED' }
>;

export function handleGraphScopeHydrationUpdated(
  message: HydrationMessage,
  current: Readonly<Record<string, boolean>>,
): PartialState {
  const scopeHydrationPending = { ...current };
  for (const scopeId of message.payload.scopeIds) {
    if (message.payload.hydrating) {
      scopeHydrationPending[scopeId] = true;
    } else {
      delete scopeHydrationPending[scopeId];
    }
  }
  return { scopeHydrationPending };
}
