import React from 'react';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
  IGraphTypeDescription,
} from '../../../shared/graphControls/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../shared/graphControls/defaults/edgeTypes';
import { cn } from '../ui/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';
import { Switch } from '../ui/switch';
import { graphStore } from '../../store/state';
import {
  scheduleEdgeVisibilityMessage,
  scheduleNodeVisibilityMessage,
} from './messages';

const FOLDER_NODE_TYPE = 'folder';

interface ScopeRowProps {
  color?: string;
  enabled: boolean;
  label: string;
  onCheckedChange: (visible: boolean) => void;
  depth?: number;
  description?: IGraphTypeDescription;
}

interface NodeTypeRowsProps {
  nodeColors: Record<string, string>;
  nodeTypes: IGraphNodeTypeDefinition[];
  nodeVisibility: Record<string, boolean>;
}

interface EdgeTypeRowsProps {
  edgeColors: Record<string, string>;
  edgeTypes: IGraphEdgeTypeDefinition[];
  edgeVisibility: Record<string, boolean>;
  nodeVisibility: Record<string, boolean>;
}

function getParentNodeTypeUpdates(
  nodeTypes: IGraphNodeTypeDefinition[],
  nodeTypeId: string,
): Record<string, boolean> {
  const nodeTypeById = new Map(nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
  const updates: Record<string, boolean> = {};
  let current = nodeTypeById.get(nodeTypeId);

  while (current?.parentId) {
    updates[current.parentId] = true;
    current = nodeTypeById.get(current.parentId);
  }

  return updates;
}

function updateNodeVisibilityOptimistically(
  nodeTypes: IGraphNodeTypeDefinition[],
  nodeTypeId: string,
  visible: boolean,
): void {
  const parentUpdates = visible ? getParentNodeTypeUpdates(nodeTypes, nodeTypeId) : {};

  graphStore.setState((state) => ({
    nodeVisibility: {
      ...state.nodeVisibility,
      ...parentUpdates,
      [nodeTypeId]: visible,
    },
  }));
}

function updateEdgeVisibilityOptimistically(edgeKind: string, visible: boolean): void {
  graphStore.setState((state) => ({
    edgeVisibility: {
      ...state.edgeVisibility,
      [edgeKind]: visible,
    },
  }));
}

export function resolveScopeRowClassName(enabled: boolean): string {
  return cn(
    'flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--cg-accent-subtle)]',
    !enabled && 'opacity-65',
  );
}

function ScopeRowTooltipContent({
  color,
  description,
  label,
}: {
  color?: string;
  description: IGraphTypeDescription;
  label: string;
}): React.ReactElement {
  const example = description.examples?.[0];

  return (
    <div className="max-w-80 space-y-2" data-scope-tooltip-body={label}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-popover-foreground">
          {color ? (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: color }}
              aria-hidden="true"
              data-scope-tooltip-swatch={label}
            />
          ) : null}
          <span>{label}</span>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">{description.description}</p>
      </div>
      {example ? (
        <div className="border-t border-border/70 pt-2">
          <code
            className="block max-w-full overflow-x-auto whitespace-pre rounded bg-muted px-2 py-1 font-mono text-[11px] leading-snug text-popover-foreground"
            data-scope-tooltip-example={label}
          >
            {example.code}
          </code>
        </div>
      ) : null}
    </div>
  );
}

function ScopeRow({
  color,
  depth = 0,
  description,
  enabled,
  label,
  onCheckedChange,
}: ScopeRowProps): React.ReactElement {
  const row = (
    <div
      className={cn(
        resolveScopeRowClassName(enabled),
        description && 'cursor-pointer',
        depth === 1 && 'pl-7',
        depth >= 2 && 'pl-11',
      )}
      data-scope-row={label}
      data-scope-depth={depth}
    >
      {color ? (
        <span
          className="h-3 w-3 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: color }}
          aria-hidden="true"
          data-scope-swatch={label}
        />
      ) : (
        <span className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{label}</div>
      </div>
      <Switch checked={enabled} onCheckedChange={onCheckedChange} aria-label={`Toggle ${label}`} />
    </div>
  );

  if (!description) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent
        side="left"
        align="start"
        sideOffset={12}
        collisionPadding={16}
        className="max-w-80 px-3 py-2"
      >
        <ScopeRowTooltipContent color={color} description={description} label={label} />
      </TooltipContent>
    </Tooltip>
  );
}

export function NodeTypeRows({
  nodeColors,
  nodeTypes,
  nodeVisibility,
}: NodeTypeRowsProps): React.ReactElement {
  const nodeTypeById = new Map(nodeTypes.map((nodeType) => [nodeType.id, nodeType]));
  const parentIds = new Set(
    nodeTypes
      .map((nodeType) => nodeType.parentId)
      .filter((parentId): parentId is string => Boolean(parentId)),
  );
  const getDepth = (nodeType: IGraphNodeTypeDefinition): number => {
    let depth = 0;
    let current = nodeType;
    while (current.parentId) {
      depth += 1;
      const parent = nodeTypeById.get(current.parentId);
      if (!parent) {
        break;
      }
      current = parent;
    }
    return depth;
  };

  return (
    <>
      {nodeTypes.map((nodeType) => {
        const isParentRow = parentIds.has(nodeType.id);
        const color = isParentRow ? undefined : nodeColors[nodeType.id] ?? nodeType.defaultColor;
        const enabled = nodeVisibility[nodeType.id] ?? nodeType.defaultVisible;

        return (
          <ScopeRow
            key={nodeType.id}
            color={color}
            description={nodeType.description}
            depth={getDepth(nodeType)}
            enabled={enabled}
            label={nodeType.label}
            onCheckedChange={(visible) => {
              updateNodeVisibilityOptimistically(nodeTypes, nodeType.id, visible);
              scheduleNodeVisibilityMessage(nodeType.id, visible);
            }}
          />
        );
      })}
    </>
  );
}

export function EdgeTypeRows({
  edgeColors,
  edgeTypes,
  edgeVisibility,
  nodeVisibility,
}: EdgeTypeRowsProps): React.ReactElement {
  const folderNodesEnabled = nodeVisibility[FOLDER_NODE_TYPE] ?? false;
  const visibleEdgeTypes = folderNodesEnabled
    ? edgeTypes
    : edgeTypes.filter((edgeType) => edgeType.id !== STRUCTURAL_NESTS_EDGE_KIND);
  const availableEdgeTypes = visibleEdgeTypes.filter((edgeType) =>
    !edgeType.requiresEdgeType
    || edgeVisibility[edgeType.requiresEdgeType] === true
    || edgeVisibility[edgeType.id] === true
  );

  return (
    <>
      {availableEdgeTypes.map((edgeType) => {
        const color = edgeColors[edgeType.id] ?? edgeType.defaultColor;
        const enabled = edgeVisibility[edgeType.id] ?? edgeType.defaultVisible;

        return (
          <ScopeRow
            key={edgeType.id}
            color={color}
            description={edgeType.description}
            enabled={enabled}
            label={edgeType.label}
            onCheckedChange={(visible) => {
              updateEdgeVisibilityOptimistically(edgeType.id, visible);
              scheduleEdgeVisibilityMessage(edgeType.id, visible);
            }}
          />
        );
      })}
    </>
  );
}
