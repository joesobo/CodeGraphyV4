import { pruneGraphControlConfigMap } from '../../../../../shared/graphControls/settings';
import type { GraphViewSettingsMessageHandlers } from '../router';
import { applyGraphControlsUpdate } from './controlConfig';
import { hydrateOrReprocessGraphScope, shouldHydrateGraphScope } from './graphScopeHydration';
import { getParentNodeTypeUpdates } from './nodeVisibility';

export async function applySymbolVisibilityUpdate(
  visible: boolean,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const previousVisibility = currentNodeVisibility(handlers);
  const nextVisibility = { ...previousVisibility, symbol: visible };
  await publishNodeVisibility(previousVisibility, nextVisibility, handlers);
  return true;
}

export async function applySymbolDependentVisibilityUpdate(
  nodeType: string,
  visible: boolean,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (!visible) {
    return applyGraphControlsUpdate('nodeVisibility', nodeType, false, handlers);
  }

  const previousVisibility = currentNodeVisibility(handlers);
  const nextVisibility = {
    ...previousVisibility,
    ...getParentNodeTypeUpdates(nodeType),
    [nodeType]: true,
  };
  await publishNodeVisibility(previousVisibility, nextVisibility, handlers);
  return true;
}

function currentNodeVisibility(
  handlers: GraphViewSettingsMessageHandlers,
): Record<string, boolean> {
  return pruneGraphControlConfigMap(
    'nodeVisibility',
    handlers.getConfig<Record<string, boolean>>('nodeVisibility', {}),
  );
}

async function publishNodeVisibility(
  previousVisibility: Record<string, boolean>,
  nextVisibility: Record<string, boolean>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<void> {
  await handlers.updateConfig('nodeVisibility', nextVisibility);
  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
  handlers.sendGraphControls();
  if (shouldHydrateGraphScope(previousVisibility, nextVisibility)) {
    await hydrateOrReprocessGraphScope(handlers);
  }
}
