import React from 'react';
import {
  mdiFilePlusOutline,
  mdiFolderPlusOutline,
  mdiPlusBoxOutline,
  mdiShapeSquarePlus,
} from '@mdi/js';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/menus/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/overlay/tooltip';
import { graphStore } from '../../../store/state';

type GraphViewCreateContribution = CoreGraphViewContributionSet['contextMenu'][number];
type GraphViewCreateContext = Parameters<GraphViewCreateContribution['contribution']['run']>[0];
type GraphMode = '2d' | '3d';

function postRootFileCreation(): void {
  graphStore.getState().beginInlineCreate('file', '.');
}

function postRootFolderCreation(): void {
  graphStore.getState().beginInlineCreate('folder', '.');
}

export interface ResolvedGraphViewCreateContribution {
  context: GraphViewCreateContext;
  entry: GraphViewCreateContribution;
  label: string;
}

function isGraphViewCreateContribution(
  entry: GraphViewCreateContribution,
  context: GraphViewCreateContext,
): boolean {
  return entry.contribution.placement?.menu === 'create'
    && entry.contribution.targets.some(target => target.kind === 'background')
    && (entry.contribution.isVisible?.(context) ?? true);
}

function createGraphViewCreateContext(
  graphMode: GraphMode,
  timelineActive: boolean,
): GraphViewCreateContext {
  return {
    target: { kind: 'background' },
    graphMode,
    timelineActive,
    selectedNodeIds: [],
    selectedEdgeIds: [],
  };
}

export function resolveGraphViewCreateContributions({
  graphMode,
  graphViewContributions,
  timelineActive,
}: {
  graphMode: GraphMode;
  graphViewContributions?: CoreGraphViewContributionSet;
  timelineActive: boolean;
}): ResolvedGraphViewCreateContribution[] {
  const context = createGraphViewCreateContext(graphMode, timelineActive);
  return graphViewContributions?.contextMenu
    .filter(entry => isGraphViewCreateContribution(entry, context))
    .map(entry => ({
      context,
      entry,
      label: entry.contribution.getLabel?.(context) ?? entry.contribution.label,
    })) ?? [];
}

function runGraphViewCreateContribution(
  contribution: ResolvedGraphViewCreateContribution,
): void {
  void contribution.entry.contribution.run(contribution.context);
}

export function CreateToolbarAction({
  graphMode,
  graphViewContributions,
  timelineActive,
}: {
  graphMode: GraphMode;
  graphViewContributions?: CoreGraphViewContributionSet;
  timelineActive: boolean;
}): React.ReactElement {
  const graphViewCreateContributions = resolveGraphViewCreateContributions({
    graphMode,
    graphViewContributions,
    timelineActive,
  });

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
        {graphViewCreateContributions.map(contribution => (
          <DropdownMenuItem
            key={`${contribution.entry.pluginId}:${contribution.entry.contribution.id}`}
            className="gap-2"
            onSelect={() => runGraphViewCreateContribution(contribution)}
          >
            <MdiIcon path={mdiShapeSquarePlus} size={15} className="shrink-0" />
            <span>{contribution.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
