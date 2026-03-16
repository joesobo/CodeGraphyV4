/**
 * @fileoverview Right-side toolbar action buttons.
 * Provides refresh, export dropdown, plugins, and settings buttons.
 * @module webview/components/toolbar/ToolbarActions
 */

import React from 'react';
import { mdiAutorenew, mdiPuzzleOutline, mdiCogOutline, mdiExport } from '@mdi/js';
import { MdiIcon } from '../icons';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { useGraphStore } from '../../store';
import { postMessage } from '../../vscodeApi';

export function ToolbarActions(): React.ReactElement {
  const setActivePanel = useGraphStore(s => s.setActivePanel);

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
            onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
            title="Refresh Graph"
          >
            <MdiIcon path={mdiAutorenew} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Refresh Graph</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
                title="Export"
              >
                <MdiIcon path={mdiExport} size={16} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Export</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuLabel>Images</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_PNG' }, '*')}>
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_SVG' }, '*')}>
            Export as SVG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_JPEG' }, '*')}>
            Export as JPEG
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Connections</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_JSON' }, '*')}>
            Export as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => window.postMessage({ type: 'REQUEST_EXPORT_MD' }, '*')}>
            Export as Markdown
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
            onClick={() => setActivePanel('plugins')}
            title="Plugins"
          >
            <MdiIcon path={mdiPuzzleOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Plugins</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
            onClick={() => setActivePanel('settings')}
            title="Settings"
          >
            <MdiIcon path={mdiCogOutline} size={16} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
    </div>
  );
}
