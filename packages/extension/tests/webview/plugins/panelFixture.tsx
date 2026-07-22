import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { IPluginStatus } from '../../../src/shared/plugins/status';
import PluginsPanel from '../../../src/webview/components/plugins/Panel';
import { graphStore } from '../../../src/webview/store/state';

export function setPluginStatuses(pluginStatuses: IPluginStatus[]): void {
  graphStore.setState({ pluginStatuses });
}

export function renderPanel(pluginStatuses: IPluginStatus[], isOpen = true) {
  setPluginStatuses(pluginStatuses);
  const onClose = vi.fn();
  const result = render(<PluginsPanel isOpen={isOpen} onClose={onClose} />);
  return { ...result, onClose };
}

export function resetPanelState(): void {
  graphStore.setState({ graphIsIndexing: false });
  setPluginStatuses([]);
}

export { PluginsPanel, graphStore };
export type { IPluginStatus };
