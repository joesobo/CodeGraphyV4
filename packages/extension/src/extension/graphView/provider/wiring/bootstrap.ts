import type { NodeSizeMode } from '../../../../shared/settings/modes';

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
  onDecorationsChanged,
}: InitializeGraphViewProviderServicesOptions): void {
  for (const view of coreViews) {
    viewRegistry.register(view, {
      core: true,
      isDefault: view === coreViews[0],
    });
  }

  analyzer.setEventBus(eventBus);

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
