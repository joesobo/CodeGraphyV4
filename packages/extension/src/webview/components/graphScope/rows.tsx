import React from 'react';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
  IGraphTypeDescription,
} from '../../../shared/graphControls/contracts';
import { cn } from '../ui/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/overlay/tooltip';
import { Switch } from '../ui/switch';
import {
  applyEdgeScopeVisibility,
  applyNodeScopeVisibility,
  resolveAvailableEdgeTypes,
} from './visibility';

export { resolveAvailableEdgeTypes } from './visibility';

interface ScopeRowProps {
  color?: string;
  enabled: boolean;
  label: string;
  onCheckedChange: (visible: boolean) => void;
  depth?: number;
  description?: IGraphTypeDescription;
  hydrating?: boolean;
}

interface NodeTypeRowsProps {
  nodeColors: Record<string, string>;
  nodeTypes: IGraphNodeTypeDefinition[];
  nodeVisibility: Record<string, boolean>;
  scopeHydrationPending?: Record<string, boolean>;
}

interface EdgeTypeRowsProps {
  edgeColors: Record<string, string>;
  edgeTypes: IGraphEdgeTypeDefinition[];
  edgeVisibility: Record<string, boolean>;
  graphHasIndex: boolean;
  nodeVisibility: Record<string, boolean>;
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
  hydrating = false,
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
      data-scope-hydrating={hydrating}
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
      {hydrating ? (
        <span
          className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent"
          data-scope-hydration-indicator={label}
          aria-hidden="true"
        />
      ) : null}
      <Switch
        checked={enabled}
        disabled={hydrating}
        onCheckedChange={onCheckedChange}
        aria-label={`Toggle ${label}`}
      />
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
  scopeHydrationPending = {},
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
            hydrating={scopeHydrationPending[nodeType.id] === true}
            label={nodeType.label}
            onCheckedChange={(visible) => {
              applyNodeScopeVisibility(nodeTypes, nodeType.id, visible);
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
  graphHasIndex,
  nodeVisibility,
}: EdgeTypeRowsProps): React.ReactElement {
  const availableEdgeTypes = resolveAvailableEdgeTypes(edgeTypes, edgeVisibility, graphHasIndex, nodeVisibility);

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
              applyEdgeScopeVisibility(edgeType.id, visible);
            }}
          />
        );
      })}
    </>
  );
}
