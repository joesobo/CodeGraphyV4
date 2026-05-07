import React from 'react';
import {
  mdiFilePlusOutline,
  mdiFolderPlusOutline,
  mdiPlusBoxOutline,
  mdiVectorSquarePlus,
} from '@mdi/js';
import {
  DEFAULT_GRAPH_SECTION_COLOR,
  DEFAULT_GRAPH_SECTION_HEIGHT,
  DEFAULT_GRAPH_SECTION_WIDTH,
} from '../../../../shared/settings/graphLayout';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/menus/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/overlay/tooltip';
import { postMessage } from '../../../vscodeApi';

interface CreateToolbarActionProps {
  graphMode: '2d' | '3d';
  timelineActive: boolean;
}

function postRootGraphSectionCreation(): void {
  postMessage({
    type: 'CREATE_GRAPH_LAYOUT_SECTION',
    payload: {
      color: DEFAULT_GRAPH_SECTION_COLOR,
      height: DEFAULT_GRAPH_SECTION_HEIGHT,
      memberNodeIds: [],
      width: DEFAULT_GRAPH_SECTION_WIDTH,
      x: -(DEFAULT_GRAPH_SECTION_WIDTH / 2),
      y: -(DEFAULT_GRAPH_SECTION_HEIGHT / 2),
    },
  });
}

function postRootFileCreation(): void {
  postMessage({ type: 'CREATE_FILE', payload: { directory: '.' } });
}

function postRootFolderCreation(): void {
  postMessage({ type: 'CREATE_FOLDER', payload: { directory: '.' } });
}

export function CreateToolbarAction({
  graphMode,
  timelineActive,
}: CreateToolbarActionProps): React.ReactElement {
  const sectionCreationAvailable = graphMode === '2d' && !timelineActive;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-transparent"
              title="New..."
              aria-label="New..."
            >
              <MdiIcon path={mdiPlusBoxOutline} size={16} />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">New...</TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="right" align="start" className="w-48">
        <DropdownMenuItem onSelect={postRootFileCreation}>
          <MdiIcon path={mdiFilePlusOutline} size={15} />
          <span>New File...</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={postRootFolderCreation}>
          <MdiIcon path={mdiFolderPlusOutline} size={15} />
          <span>New Folder...</span>
        </DropdownMenuItem>
        {sectionCreationAvailable ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={postRootGraphSectionCreation}>
              <MdiIcon path={mdiVectorSquarePlus} size={15} />
              <span>New Graph Section</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
