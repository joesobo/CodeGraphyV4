/**
 * @fileoverview Right-side toolbar action buttons.
 * Provides refresh, export dropdown, plugins, and settings buttons.
 * @module webview/components/toolbar/Actions
 */

import React, { useEffect, useRef } from 'react';
import {
  mdiAutorenew,
  mdiCogOutline,
  mdiPaletteOutline,
  mdiLinkVariant,
  mdiShapeOutline,
  mdiVectorLine,
  mdiPuzzleOutline,
  mdiExport,
} from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '../ui/menus/dropdown-menu';
import { graphStore, useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

export interface ToolbarActionItemLike {
  id: string;
  label: string;
  index: number;
}

export interface ToolbarActionLike {
  id: string;
  label: string;
  icon?: string;
  pluginId: string;
  pluginName: string;
  index: number;
  items: ToolbarActionItemLike[];
}

export function getToolbarActionKey(action: ToolbarActionLike): string {
  return `${action.pluginId}:${action.id}:${action.index}`;
}

export function getToolbarActionItemKey(
  action: ToolbarActionLike,
  item: ToolbarActionItemLike,
): string {
  return `${action.pluginId}:${action.id}:${item.index}`;
}

export function getToolbarActionIconPath(action: { icon?: string }): string {
  return action.icon ?? mdiLinkVariant;
}

type ToolbarPanel =
  'nodes'
  | 'edges'
  | 'legends'
  | 'plugins'
  | 'settings'
  | 'export';

function clearPendingIndexTimeout(
  timeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
): void {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
}

function createRefreshConfig(graphHasIndex: boolean): {
  phase: string;
  title: string;
  type: 'INDEX_GRAPH' | 'REFRESH_GRAPH';
} {
  return graphHasIndex
    ? { phase: 'Refreshing Index', title: 'Refresh', type: 'REFRESH_GRAPH' }
    : { phase: 'Indexing Repo', title: 'Index Repo', type: 'INDEX_GRAPH' };
}

function postPluginToolbarAction(
  action: ToolbarActionLike,
  item: ToolbarActionItemLike,
): void {
  window.postMessage({
    type: 'RUN_PLUGIN_TOOLBAR_ACTION',
    payload: {
      pluginId: action.pluginId,
      index: action.index,
      itemIndex: item.index,
    },
  }, '*');
}

function ToolbarIconButton({
  disabled = false,
  iconPath,
  onClick,
  title,
}: {
  disabled?: boolean;
  iconPath: string;
  onClick: () => void;
  title: string;
}): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 bg-transparent"
          onClick={onClick}
          title={title}
          disabled={disabled}
        >
          <MdiIcon path={iconPath} size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

function PluginToolbarActionMenu({
  action,
}: {
  action: ToolbarActionLike;
}): React.ReactElement {
  return (
    <DropdownMenu key={getToolbarActionKey(action)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-transparent"
              title={action.label}
            >
              <MdiIcon path={getToolbarActionIconPath(action)} size={16} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{action.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" side="right">
        <DropdownMenuLabel>{action.label}</DropdownMenuLabel>
        {action.items.map((item) => (
          <DropdownMenuItem
            key={getToolbarActionItemKey(action, item)}
            onSelect={() => postPluginToolbarAction(action, item)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

  const requestIndex = (): void => {
    clearPendingIndexTimeout(timeoutRef);
    graphStore.setState({
      graphIsIndexing: true,
      graphIndexProgress: {
        phase: refresh.phase,
        current: 0,
        total: 1,
      },
    });
    timeoutRef.current = setTimeout(() => {
      const state = graphStore.getState();
      if (
        state.graphIsIndexing
        && state.graphIndexProgress?.phase === refresh.phase
        && state.graphIndexProgress.current === 0
        && state.graphIndexProgress.total === 1
      ) {
        graphStore.setState({
          graphIsIndexing: false,
          graphIndexProgress: null,
        });
      }
    }, 10_000);
    postMessage({ type: refresh.type });
  };

  useEffect(() => {
    if (!graphIsIndexing) {
      clearPendingIndexTimeout(timeoutRef);
    }
  }, [graphIsIndexing]);

  useEffect(() => () => clearPendingIndexTimeout(timeoutRef), []);

  const panelButtons: Array<{ iconPath: string; panel: ToolbarPanel; title: string }> = [
    { iconPath: mdiExport, panel: 'export', title: 'Export' },
    { iconPath: mdiShapeOutline, panel: 'nodes', title: 'Nodes' },
    { iconPath: mdiVectorLine, panel: 'edges', title: 'Edges' },
    { iconPath: mdiPaletteOutline, panel: 'legends', title: 'Legends' },
    { iconPath: mdiPuzzleOutline, panel: 'plugins', title: 'Plugins' },
    { iconPath: mdiCogOutline, panel: 'settings', title: 'Settings' },
  ];

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

      {panelButtons.map((button) => (
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
