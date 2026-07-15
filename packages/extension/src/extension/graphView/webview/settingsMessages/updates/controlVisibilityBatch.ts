import { pruneGraphControlConfigMap } from '../../../../../shared/graphControls/settings';
import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';
import { hydrateOrReprocessGraphScope, shouldHydrateGraphScope } from './graphScopeHydration';
import { applyNodeVisibilityEntry } from './nodeVisibility';

export async function applyGraphControlVisibilityBatch(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH' }>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const nodeUpdates = message.payload.nodeVisibility ?? {};
  const edgeUpdates = message.payload.edgeVisibility ?? {};

  if (Object.keys(nodeUpdates).length > 0) {
    await applyNodeVisibilityBatch(nodeUpdates, handlers);
  }
  if (Object.keys(edgeUpdates).length > 0) {
    await applyEdgeVisibilityBatch(edgeUpdates, handlers);
  }
  if (Object.keys(nodeUpdates).length > 0 || Object.keys(edgeUpdates).length > 0) {
    handlers.sendGraphControls();
  }
  return true;
}

async function applyNodeVisibilityBatch(
  updates: Record<string, boolean>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<void> {
  const previousVisibility = pruneGraphControlConfigMap(
    'nodeVisibility',
    handlers.getConfig<Record<string, boolean>>('nodeVisibility', {}),
  );
  const nextVisibility = Object.entries(updates).reduce(
    (visibility, [nodeType, visible]) => applyNodeVisibilityEntry(visibility, nodeType, visible),
    previousVisibility,
  );
  const prunedVisibility = pruneGraphControlConfigMap('nodeVisibility', nextVisibility);

  await handlers.updateConfig('nodeVisibility', prunedVisibility);
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
  if (shouldHydrateGraphScope(previousVisibility, prunedVisibility)) {
    await hydrateOrReprocessGraphScope(handlers);
  }
}

async function applyEdgeVisibilityBatch(
  updates: Record<string, boolean>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<void> {
  await handlers.updateConfig(
    'edgeVisibility',
    pruneGraphControlConfigMap('edgeVisibility', {
      ...handlers.getConfig<Record<string, boolean>>('edgeVisibility', {}),
      ...updates,
    }),
  );
}
