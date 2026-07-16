import type { NodeSizeMode } from '../../../../shared/settings/modes';
import { savePluginExport } from '../../../export/pluginSave';

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
      exportSaver: (request: unknown) => Promise<void>;
      workspaceRoot: string;
    }): void;
  };
}

interface GraphViewDecorationManagerLike {
  onDecorationsChanged(handler: () => void): void;
}

interface GraphViewConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
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
  configuration: GraphViewConfigurationLike;
  nodeSizeModeKey: string;
  depthModeKey?: string;
  fallbackNodeSizeMode: NodeSizeMode;
}

function normalizeNodeSizeMode(mode: unknown): NodeSizeMode {
  return mode === 'file-size' ? 'file-size' : 'connections';
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
      isDefault: view === coreViews[0],
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
    exportSaver: (request: unknown) => savePluginExport(request as Parameters<typeof savePluginExport>[0]),
    workspaceRoot,
  });

  decorationManager.onDecorationsChanged(onDecorationsChanged);
}

export function restoreGraphViewProviderState({
  configuration,
  nodeSizeModeKey,
  depthModeKey,
  fallbackNodeSizeMode,
}: RestoreGraphViewProviderStateOptions): {
  depthMode: boolean;
  nodeSizeMode: NodeSizeMode;
} {
  const depthMode = configuration.get<boolean>(depthModeKey ?? 'depthMode', false);

  return {
    depthMode,
    nodeSizeMode: normalizeNodeSizeMode(
      configuration.get<unknown>(nodeSizeModeKey, fallbackNodeSizeMode),
    ),
  };
}
