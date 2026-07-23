import React from 'react';
import {
  mdiFilePlusOutline,
  mdiFolderPlusOutline,
  mdiPlusBoxOutline,
  mdiShapeSquarePlus,
} from '@mdi/js';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/menus/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/overlay/tooltip';
import { postRootFileCreation, postRootFolderCreation } from './rootCreation';

type GraphViewCreateContribution = ExtensionGraphViewContributionSet['contextMenu'][number];
type GraphViewCreateContext = Parameters<GraphViewCreateContribution['contribution']['run']>[0];


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

function createGraphViewCreateContext(): GraphViewCreateContext {
  return {
    target: { kind: 'background' },
    selectedNodeIds: [],
    selectedEdgeIds: [],
  };
}

export function resolveGraphViewCreateContributions({
  graphViewContributions,
}: {
  graphViewContributions?: ExtensionGraphViewContributionSet;
}): ResolvedGraphViewCreateContribution[] {
  const context = createGraphViewCreateContext();
  const resolved: ResolvedGraphViewCreateContribution[] = [];
  for (const entry of graphViewContributions?.contextMenu ?? []) {
    try {
      if (!isGraphViewCreateContribution(entry, context)) continue;
      resolved.push({
        context,
        entry,
        label: entry.contribution.getLabel?.(context) ?? entry.contribution.label,
      });
    } catch (error) {
      console.error(
        `[CodeGraphy] Create contribution '${entry.contribution.id}' from plugin '${entry.pluginId}' failed:`,
        error,
      );
    }
  }
  return resolved;
}

function runGraphViewCreateContribution(
  contribution: ResolvedGraphViewCreateContribution,
): void {
  const { entry, context } = contribution;
  const report = (error: unknown): void => {
    console.error(
      `[CodeGraphy] Create contribution '${entry.contribution.id}' from plugin '${entry.pluginId}' failed:`,
      error,
    );
  };
  try {
    void Promise.resolve(entry.contribution.run(context)).catch(report);
  } catch (error) {
    report(error);
  }
}

export function CreateToolbarAction({
  graphViewContributions,
}: {
  graphViewContributions?: ExtensionGraphViewContributionSet;
}): React.ReactElement {
  const graphViewCreateContributions = resolveGraphViewCreateContributions({
    graphViewContributions,
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
