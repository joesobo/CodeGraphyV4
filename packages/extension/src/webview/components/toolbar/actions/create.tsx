import React from 'react';
import {
  mdiFilePlusOutline,
  mdiFolderPlusOutline,
  mdiPlusBoxOutline,
  mdiVectorSquarePlus,
} from '@mdi/js';
import {
  DEFAULT_GRAPH_SECTION_COLOR,
  getDefaultGraphSectionSize,
} from '../../../../shared/settings/graphLayout';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/menus/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/overlay/tooltip';
import { postMessage } from '../../../vscodeApi';
import type { GraphContextMutationAvailability } from '../../graph/contextMenu/contracts';

interface CreateToolbarActionProps {
  graphMode: '2d' | '3d';
  mutationAvailability: GraphContextMutationAvailability;
}

function postRootGraphSectionCreation(): void {
  const size = getDefaultGraphSectionSize();
  postMessage({
    type: 'CREATE_GRAPH_LAYOUT_SECTION',
    payload: {
      color: DEFAULT_GRAPH_SECTION_COLOR,
      height: size.height,
      memberNodeIds: [],
      width: size.width,
      x: -(size.width / 2),
      y: -(size.height / 2),
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
  mutationAvailability,
}: CreateToolbarActionProps): React.ReactElement {
  const sectionCreationAvailable = graphMode === '2d'
    && mutationAvailability !== 'hidden';
  const sectionCreationDisabled = mutationAvailability === 'disabled';

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
        <DropdownMenuItem className="gap-2" onSelect={postRootFileCreation}>
          <MdiIcon path={mdiFilePlusOutline} size={15} className="shrink-0" />
          <span>New File...</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onSelect={postRootFolderCreation}>
          <MdiIcon path={mdiFolderPlusOutline} size={15} className="shrink-0" />
          <span>New Folder...</span>
        </DropdownMenuItem>
        {sectionCreationAvailable ? (
          <DropdownMenuItem
            className="gap-2"
            disabled={sectionCreationDisabled}
            onSelect={postRootGraphSectionCreation}
          >
            <MdiIcon path={mdiVectorSquarePlus} size={15} className="shrink-0" />
            <span>New Graph Section</span>
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
