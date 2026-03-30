import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';

interface GraphViewCoreViewLike {
  id: string;
}

interface GraphViewViewRegistryLike {
  register(
    view: GraphViewCoreViewLike,
    options: { core: boolean; isDefault: boolean },
  ): void;
  get(viewId: string): unknown;
  getDefaultViewId(): string | undefined;
}

interface GraphViewAnalyzerLike {
  setEventBus(eventBus: unknown): void;
  registry: {
    configureV2(options: {
      eventBus: unknown;
      decorationManager: unknown;
      viewRegistry: GraphViewViewRegistryLike;
      graphProvider: () => unknown;
      commandRegistrar: (id: string, action: () => void) => unknown;
      webviewSender: (message: unknown) => void;
      workspaceRoot: string;
    }): void;
  };
}

interface GraphViewDecorationManagerLike {
  onDecorationsChanged(handler: () => void): void;
}

interface GraphViewWorkspaceStateLike {
  get<T>(key: string): T | undefined;
}

interface InitializeGraphViewProviderServicesOptions {
  analyzer: GraphViewAnalyzerLike;
  viewRegistry: GraphViewViewRegistryLike;
  coreViews: readonly GraphViewCoreViewLike[];
  eventBus: unknown;
  decorationManager: GraphViewDecorationManagerLike;
  getGraphData: () => unknown;
  registerCommand: (id: string, action: () => void) => unknown;
  pushSubscription: (subscription: unknown) => void;
  sendMessage: (message: unknown) => void;
  workspaceRoot: string;
  onDecorationsChanged: () => void;
}

interface RestoreGraphViewProviderStateOptions {
  workspaceState: GraphViewWorkspaceStateLike;
  viewRegistry: GraphViewViewRegistryLike;
  selectedViewKey: string;
  dagModeKey: string;
  nodeSizeModeKey: string;
  fallbackViewId: string;
  fallbackNodeSizeMode: NodeSizeMode;
}

export function initializeGraphViewProviderServices({
  analyzer,
  viewRegistry,
  coreViews,
  eventBus,
  decorationManager,
  getGraphData,
  registerCommand,
  pushSubscription,
  sendMessage,
  workspaceRoot,
  onDecorationsChanged,
}: InitializeGraphViewProviderServicesOptions): void {
  for (const view of coreViews) {
    viewRegistry.register(view, {
      core: true,
      isDefault: view.id === 'codegraphy.connections',
    });
  }

  analyzer.setEventBus(eventBus);
  analyzer.registry.configureV2({
    eventBus,
    decorationManager,
    viewRegistry,
    graphProvider: () => getGraphData(),
    commandRegistrar: (id: string, action: () => void) => {
      const disposable = registerCommand(id, action);
      pushSubscription(disposable);
      return disposable;
    },
    webviewSender: (message: unknown) => {
      sendMessage(message);
    },
    workspaceRoot,
  });

  decorationManager.onDecorationsChanged(onDecorationsChanged);
}

export function restoreGraphViewProviderState({
  workspaceState,
  viewRegistry,
  selectedViewKey,
  dagModeKey,
  nodeSizeModeKey,
  fallbackViewId,
  fallbackNodeSizeMode,
}: RestoreGraphViewProviderStateOptions): {
  activeViewId: string;
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
} {
  const savedViewId = workspaceState.get<string>(selectedViewKey);

  return {
    activeViewId:
      savedViewId && viewRegistry.get(savedViewId)
        ? savedViewId
        : viewRegistry.getDefaultViewId() ?? fallbackViewId,
    dagMode: workspaceState.get<DagMode>(dagModeKey) ?? null,
    nodeSizeMode:
      workspaceState.get<NodeSizeMode>(nodeSizeModeKey) ?? fallbackNodeSizeMode,
  };
}
