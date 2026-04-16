/**
 * @fileoverview Right-side toolbar action buttons.
 * Provides refresh, export dropdown, plugins, and settings buttons.
 * @module webview/components/toolbar/Actions
 */

import React, { useEffect, useRef } from 'react';
import { mdiAutorenew } from '@mdi/js';
import { useGraphStore } from '../../store/state';
import { ToolbarIconButton } from './IconButton';
import {
  getToolbarActionKey,
  TOOLBAR_PANEL_BUTTONS,
  type ToolbarPanel,
} from './model';
import { PluginToolbarActionMenu } from './PluginMenu';
import {
  clearPendingIndexTimeout,
  createRefreshConfig,
  requestGraphIndex,
} from './refresh';

export {
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
} from './model';

export function ToolbarActions(): React.ReactElement {
  const activePanel = useGraphStore(s => s.activePanel);
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const pluginToolbarActions = useGraphStore(s => s.pluginToolbarActions);
  const graphHasIndex = useGraphStore(s => s.graphHasIndex);
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = createRefreshConfig(graphHasIndex);
  const togglePanel = (panel: ToolbarPanel): void => {
    setActivePanel(activePanel === panel ? 'none' : panel);
  };

  const requestIndex = (): void => requestGraphIndex(graphHasIndex, timeoutRef);

  useEffect(() => {
    if (!graphIsIndexing) {
      clearPendingIndexTimeout(timeoutRef);
    }
  }, [graphIsIndexing]);

  useEffect(() => () => clearPendingIndexTimeout(timeoutRef), []);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <ToolbarIconButton
        disabled={graphIsIndexing}
        iconPath={mdiAutorenew}
        onClick={requestIndex}
        title={refresh.title}
      />

      {pluginToolbarActions.map((action) => (
        <PluginToolbarActionMenu key={getToolbarActionKey(action)} action={action} />
      ))}

      {TOOLBAR_PANEL_BUTTONS.map((button) => (
        <ToolbarIconButton
          key={button.panel}
          iconPath={button.iconPath}
          onClick={() => togglePanel(button.panel)}
          title={button.title}
        />
      ))}
    </div>
  );
}
