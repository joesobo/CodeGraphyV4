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

export function ToolbarActions(): React.ReactElement {
  const activePanel = useGraphStore(s => s.activePanel);
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const pluginToolbarActions = useGraphStore(s => s.pluginToolbarActions);
  const graphHasIndex = useGraphStore(s => s.graphHasIndex);
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTitle = graphHasIndex ? 'Refresh' : 'Index Repo';
  const refreshMessageType = graphHasIndex ? 'REFRESH_GRAPH' : 'INDEX_GRAPH';
  const refreshPhase = graphHasIndex ? 'Refreshing Index' : 'Indexing Repo';
  const togglePanel = (
    panel: 'nodes' | 'edges' | 'legends' | 'plugins' | 'settings' | 'export',
  ): void => {
    setActivePanel(activePanel === panel ? 'none' : panel);
  };

  const requestIndex = (): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    graphStore.setState({
      graphIsIndexing: true,
      graphIndexProgress: {
        phase: refreshPhase,
        current: 0,
        total: 1,
      },
    });
    timeoutRef.current = setTimeout(() => {
      const state = graphStore.getState();
      if (
        state.graphIsIndexing
        && state.graphIndexProgress?.phase === refreshPhase
        && state.graphIndexProgress.current === 0
        && state.graphIndexProgress.total === 1
      ) {
        graphStore.setState({
          graphIsIndexing: false,
          graphIndexProgress: null,
        });
      }
    }, 10_000);
    postMessage({ type: refreshMessageType });
  };

  useEffect(() => {
    if (!graphIsIndexing && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [graphIsIndexing]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={requestIndex}
            title={refreshTitle}
            disabled={graphIsIndexing}
          >
            <MdiIcon path={mdiAutorenew} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{refreshTitle}</TooltipContent>
      </Tooltip>

      {pluginToolbarActions.map(action => (
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
            {action.items.map(item => (
              <DropdownMenuItem
                key={getToolbarActionItemKey(action, item)}
                onSelect={() => window.postMessage({
                  type: 'RUN_PLUGIN_TOOLBAR_ACTION',
                  payload: {
                    pluginId: action.pluginId,
                    index: action.index,
                    itemIndex: item.index,
                  },
                }, '*')}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => togglePanel('export')}
            title="Export"
          >
            <MdiIcon path={mdiExport} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Export</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => togglePanel('nodes')}
            title="Nodes"
          >
            <MdiIcon path={mdiShapeOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Nodes</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => togglePanel('edges')}
            title="Edges"
          >
            <MdiIcon path={mdiVectorLine} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Edges</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => togglePanel('legends')}
            title="Legends"
          >
            <MdiIcon path={mdiPaletteOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Legends</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => togglePanel('plugins')}
            title="Plugins"
          >
            <MdiIcon path={mdiPuzzleOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Plugins</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-transparent"
            onClick={() => togglePanel('settings')}
            title="Settings"
          >
            <MdiIcon path={mdiCogOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>
    </div>
  );
}
