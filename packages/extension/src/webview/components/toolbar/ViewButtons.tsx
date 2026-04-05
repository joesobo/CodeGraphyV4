/**
 * @fileoverview View switcher buttons and depth slider.
 * Renders icon buttons for each available graph view and an animated depth slider.
 * @module webview/components/toolbar/ViewButtons
 */

import React from 'react';
import { mdiGraphOutline, mdiBullseye, mdiFolderOutline } from '@mdi/js';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/overlay/tooltip';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';

const VIEW_ICONS: Record<string, string> = {
  'codegraphy.connections': mdiGraphOutline,
  'codegraphy.depth-graph': mdiBullseye,
  'codegraphy.folder': mdiFolderOutline,
};

export function ViewButtons(): React.ReactElement {
  const availableViews = useGraphStore(s => s.availableViews);
  const activeViewId = useGraphStore(s => s.activeViewId);

  const handleViewChange = (viewId: string) => {
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
  };

  return (
    <>
      {availableViews.length > 0 && (
        <div data-testid="view-buttons" className="flex flex-col items-center gap-1">
          {availableViews.map(view => {
            const iconPath = VIEW_ICONS[view.id];
            return (
              <Tooltip key={view.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeViewId === view.id ? 'default' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleViewChange(view.id)}
                  >
                    {iconPath ? (
                      <MdiIcon path={iconPath} size={16} />
                    ) : (
                      <span className="text-xs">{view.name[0]}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{view.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      )}
    </>
  );
}
