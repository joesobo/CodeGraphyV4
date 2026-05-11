import React from 'react';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../../shared/graphControls/contracts';
import { postMessage } from '../../vscodeApi';
import { cn } from '../ui/cn';
import { Switch } from '../ui/switch';

interface ScopeRowProps {
  color?: string;
  enabled: boolean;
  label: string;
  onCheckedChange: (visible: boolean) => void;
  nested?: boolean;
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
}

export function resolveScopeRowClassName(enabled: boolean): string {
  return cn(
    'flex items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--cg-accent-subtle)]',
    !enabled && 'opacity-65',
  );
}

function ScopeRow({
  color,
  enabled,
  label,
  nested = false,
  onCheckedChange,
}: ScopeRowProps): React.ReactElement {
  return (
    <div
      className={cn(resolveScopeRowClassName(enabled), nested && 'pl-7')}
      data-scope-row={label}
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
}

export function NodeTypeRows({
  nodeColors,
  nodeTypes,
  nodeVisibility,
}: NodeTypeRowsProps): React.ReactElement {
  const symbolDefinition = nodeTypes.find((nodeType) => nodeType.id === 'symbol');
  const symbolsEnabled = symbolDefinition
    ? (nodeVisibility.symbol ?? symbolDefinition.defaultVisible)
    : false;
  const variableDefinition = nodeTypes.find((nodeType) => nodeType.id === 'variable');
  const variablesEnabled = variableDefinition
    ? (nodeVisibility.variable ?? variableDefinition.defaultVisible)
    : false;
  const visibleNodeTypes = nodeTypes.filter((nodeType) => (
    (nodeType.id !== 'variable' || symbolsEnabled)
    && (!nodeType.parentId || (
      nodeType.parentId === 'symbol'
        ? symbolsEnabled
        : symbolsEnabled && variablesEnabled
    ))
  ));

  return (
    <>
      {visibleNodeTypes.map((nodeType) => {
        const color = nodeType.colorEditable === false
          ? undefined
          : nodeColors[nodeType.id] ?? nodeType.defaultColor;
        const enabled = nodeVisibility[nodeType.id] ?? nodeType.defaultVisible;

        return (
          <ScopeRow
            key={nodeType.id}
            color={color}
            enabled={enabled}
            label={nodeType.label}
            nested={Boolean(nodeType.parentId)}
            onCheckedChange={(visible) => {
              if (!visible && nodeType.id === 'symbol') {
                const symbolChildTypes = nodeTypes.filter((candidate) =>
                  candidate.parentId === 'symbol'
                  || candidate.parentId === 'variable'
                  || candidate.id === 'variable',
                );

                for (const childType of symbolChildTypes) {
                  postMessage({
                    type: 'UPDATE_NODE_VISIBILITY',
                    payload: { nodeType: childType.id, visible: false },
                  });
                }
              }
              postMessage({
                type: 'UPDATE_NODE_VISIBILITY',
                payload: { nodeType: nodeType.id, visible },
              });
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
}: EdgeTypeRowsProps): React.ReactElement {
  return (
    <>
      {edgeTypes.map((edgeType) => {
        const color = edgeColors[edgeType.id] ?? edgeType.defaultColor;
        const enabled = edgeVisibility[edgeType.id] ?? edgeType.defaultVisible;

        return (
          <ScopeRow
            key={edgeType.id}
            color={color}
            enabled={enabled}
            label={edgeType.label}
            onCheckedChange={(visible) => {
              postMessage({
                type: 'UPDATE_EDGE_VISIBILITY',
                payload: { edgeKind: edgeType.id, visible },
              });
            }}
          />
        );
      })}
    </>
  );
}
