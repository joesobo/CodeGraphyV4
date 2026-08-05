import { useCallback, useSyncExternalStore } from 'react';
import type { WebviewPluginHost } from '../manager';
import type { ActivePluginPanel } from './registry';

export function useActivePluginPanel(
  pluginHost: WebviewPluginHost,
): ActivePluginPanel | null {
  const subscribe = useCallback((listener: () => void) => {
    const disposable = pluginHost.subscribeActivePluginPanel(listener);
    return () => disposable.dispose();
  }, [pluginHost]);
  const getSnapshot = useCallback(
    () => pluginHost.getActivePluginPanel(),
    [pluginHost],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
