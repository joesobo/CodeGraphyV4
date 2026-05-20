import React from 'react';
import {
  mdiFilePlusOutline,
  mdiFolderPlusOutline,
  mdiPlusBoxOutline,
  mdiShapeSquarePlus,
} from '@mdi/js';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
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

type GraphViewCreateContribution = CoreGraphViewContributionSet['contextMenu'][number];

function postRootFileCreation(): void {
  postMessage({ type: 'CREATE_FILE', payload: { directory: '.' } });
}

function postRootFolderCreation(): void {
  postMessage({ type: 'CREATE_FOLDER', payload: { directory: '.' } });
}

function isGraphViewCreateContribution(
  entry: GraphViewCreateContribution,
): boolean {
  return entry.contribution.placement?.menu === 'create'
    && entry.contribution.targets.some(target => target.kind === 'background');
}

function runGraphViewCreateContribution(entry: GraphViewCreateContribution): void {
  void entry.contribution.run({
    target: { kind: 'background' },
    selectedNodeIds: [],
    selectedEdgeIds: [],
  });
}

export function CreateToolbarAction({
  graphViewContributions,
}: {
  graphViewContributions?: CoreGraphViewContributionSet;
}): React.ReactElement {
  const graphViewCreateContributions = graphViewContributions?.contextMenu.filter(
    isGraphViewCreateContribution,
  ) ?? [];

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
        {graphViewCreateContributions.map(entry => (
          <DropdownMenuItem
            key={`${entry.pluginId}:${entry.contribution.id}`}
            className="gap-2"
            onSelect={() => runGraphViewCreateContribution(entry)}
          >
            <MdiIcon path={mdiShapeSquarePlus} size={15} className="shrink-0" />
            <span>{entry.contribution.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
