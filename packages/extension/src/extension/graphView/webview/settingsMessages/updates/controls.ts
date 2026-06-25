import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import { pruneGraphControlConfigMap, type GraphControlConfigKey } from '../../../../../shared/graphControls/settings';
import { CORE_GRAPH_NODE_TYPES } from '../../../../../shared/graphControls/defaults/nodeTypes';
import { requiresSymbolAnalysisCacheTier } from '../../../../pipeline/service/cache/tiers';
import type { GraphViewSettingsMessageHandlers } from '../router';

function getUpdatedConfigMap(
  handlers: GraphViewSettingsMessageHandlers,
  key: GraphControlConfigKey,
  entryKey: string,
  value: boolean | string,
): Record<string, boolean | string> {
  return pruneGraphControlConfigMap(key, {
    ...handlers.getConfig<Record<string, boolean | string>>(key, {}),
    [entryKey]: value,
  });
}

async function applyGraphControlsUpdate(
  key: GraphControlConfigKey,
  entryKey: string,
  value: boolean | string,
  handlers: GraphViewSettingsMessageHandlers,
  options: { publish?: boolean } = {},
): Promise<boolean> {
  await handlers.updateConfig(key, getUpdatedConfigMap(handlers, key, entryKey, value));
  if (options.publish === false) {
    return true;
  }
  if (key === 'nodeVisibility' || key === 'nodeColors') {
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();
  }
  handlers.sendGraphControls();
  return true;
}

async function hydrateOrReprocessGraphScope(
  handlers: GraphViewSettingsMessageHandlers,
): Promise<void> {
  if (await handlers.hydrateGraphScope()) {
    return;
  }

  await handlers.reprocessGraphScope();
}

function isSymbolDependentNodeType(nodeType: string): boolean {
  return nodeType === 'variable'
    || nodeType.startsWith('symbol:')
    || (nodeType.startsWith('plugin:') && nodeType.includes(':symbol:'));
}

function getParentNodeTypeUpdates(nodeType: string): Record<string, boolean> {
  const updates: Record<string, boolean> = {};
  let current = CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === nodeType);

  const hasKnownParent = Boolean(current?.parentId);
  while (current?.parentId) {
    updates[current.parentId] = true;
    current = CORE_GRAPH_NODE_TYPES.find((definition) => definition.id === current?.parentId);
  }

  if (!hasKnownParent && nodeType !== 'variable' && isSymbolDependentNodeType(nodeType)) {
    updates.symbol = true;
  }

  return updates;
}

async function applySymbolVisibilityUpdate(
  visible: boolean,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const previousVisibility = pruneGraphControlConfigMap(
    'nodeVisibility',
    handlers.getConfig<Record<string, boolean>>('nodeVisibility', {}),
  );
  const nodeVisibility: Record<string, boolean> = {
    ...previousVisibility,
    symbol: visible,
  };

  await handlers.updateConfig('nodeVisibility', nodeVisibility);

  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
  handlers.sendGraphControls();
  if (
    !requiresSymbolAnalysisCacheTier(previousVisibility)
    && requiresSymbolAnalysisCacheTier(nodeVisibility)
  ) {
    await hydrateOrReprocessGraphScope(handlers);
  }
  return true;
}

async function applySymbolDependentVisibilityUpdate(
  nodeType: string,
  visible: boolean,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (!visible) {
    return applyGraphControlsUpdate('nodeVisibility', nodeType, false, handlers);
  }

  const previousVisibility = pruneGraphControlConfigMap(
    'nodeVisibility',
    handlers.getConfig<Record<string, boolean>>('nodeVisibility', {}),
  );
  const nodeVisibility: Record<string, boolean> = {
    ...previousVisibility,
    ...getParentNodeTypeUpdates(nodeType),
    [nodeType]: true,
  };

  await handlers.updateConfig('nodeVisibility', nodeVisibility);

  handlers.recomputeGroups();
  handlers.sendGroupsUpdated();
  handlers.sendGraphControls();
  if (
    !requiresSymbolAnalysisCacheTier(previousVisibility)
    && requiresSymbolAnalysisCacheTier(nodeVisibility)
  ) {
    await hydrateOrReprocessGraphScope(handlers);
  }
  return true;
}

function applyNodeVisibilityEntry(
  nodeVisibility: Record<string, boolean>,
  nodeType: string,
  visible: boolean,
): Record<string, boolean> {
  if (!visible) {
    return {
      ...nodeVisibility,
      [nodeType]: false,
    };
  }

  return {
    ...nodeVisibility,
    ...(nodeType === 'symbol' ? {} : getParentNodeTypeUpdates(nodeType)),
    [nodeType]: true,
  };
}

async function applyGraphControlVisibilityBatch(
  message: Extract<WebviewToExtensionMessage, { type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH' }>,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const nodeVisibilityUpdates = message.payload.nodeVisibility ?? {};
  const edgeVisibilityUpdates = message.payload.edgeVisibility ?? {};
  const hasNodeUpdates = Object.keys(nodeVisibilityUpdates).length > 0;
  const hasEdgeUpdates = Object.keys(edgeVisibilityUpdates).length > 0;

  if (!hasNodeUpdates && !hasEdgeUpdates) {
    return true;
  }

  if (hasNodeUpdates) {
    const previousVisibility = pruneGraphControlConfigMap(
      'nodeVisibility',
      handlers.getConfig<Record<string, boolean>>('nodeVisibility', {}),
    );
    let nodeVisibility = previousVisibility;

    for (const [nodeType, visible] of Object.entries(nodeVisibilityUpdates)) {
      nodeVisibility = applyNodeVisibilityEntry(nodeVisibility, nodeType, visible);
    }

    const prunedNodeVisibility = pruneGraphControlConfigMap('nodeVisibility', nodeVisibility);
    await handlers.updateConfig('nodeVisibility', prunedNodeVisibility);
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();

    if (
      !requiresSymbolAnalysisCacheTier(previousVisibility)
      && requiresSymbolAnalysisCacheTier(prunedNodeVisibility)
    ) {
      await hydrateOrReprocessGraphScope(handlers);
    }
  }

  if (hasEdgeUpdates) {
    await handlers.updateConfig(
      'edgeVisibility',
      pruneGraphControlConfigMap('edgeVisibility', {
        ...handlers.getConfig<Record<string, boolean>>('edgeVisibility', {}),
        ...edgeVisibilityUpdates,
      }),
    );
  }

  handlers.sendGraphControls();
  return true;
}

export async function applyGraphControlMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  if (message.type === 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH') {
    return applyGraphControlVisibilityBatch(message, handlers);
  }

  if (message.type === 'UPDATE_NODE_VISIBILITY') {
    if (message.payload.nodeType === 'symbol') {
      return applySymbolVisibilityUpdate(message.payload.visible, handlers);
    }

    if (isSymbolDependentNodeType(message.payload.nodeType)) {
      return applySymbolDependentVisibilityUpdate(
        message.payload.nodeType,
        message.payload.visible,
        handlers,
      );
    }

    return applyGraphControlsUpdate(
      'nodeVisibility',
      message.payload.nodeType,
      message.payload.visible,
      handlers,
    );
  }

  if (message.type === 'UPDATE_EDGE_VISIBILITY') {
    return applyGraphControlsUpdate(
      'edgeVisibility',
      message.payload.edgeKind,
      message.payload.visible,
      handlers,
    );
  }

  if (message.type === 'UPDATE_NODE_COLOR') {
    await applyGraphControlsUpdate(
      'nodeColors',
      message.payload.nodeType,
      message.payload.color,
      handlers,
      { publish: false },
    );
    handlers.recomputeGroups();
    handlers.sendGroupsUpdated();
    handlers.sendGraphControls();
    return true;
  }

  return false;
}
