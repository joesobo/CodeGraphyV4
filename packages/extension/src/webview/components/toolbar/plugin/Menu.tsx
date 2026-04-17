import React from 'react';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/overlay/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../ui/menus/dropdown-menu';
import {
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
  type ToolbarActionItemLike,
  type ToolbarActionLike,
} from '../model';

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

export function PluginToolbarActionMenu({
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
