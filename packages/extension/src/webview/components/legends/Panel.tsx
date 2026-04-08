import React, { useMemo, useState } from 'react';
import { mdiClose, mdiDelete, mdiPlus } from '@mdi/js';
import type { IGroup, LegendRuleTarget } from '../../../shared/settings/groups';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';

function LegendColorSection({
  title,
  entries,
  onChange,
}: {
  title: string;
  entries: Array<{ id: string; label: string; color: string }>;
  onChange: (id: string, color: string) => void;
}): React.ReactElement | null {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{entry.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{entry.id}</div>
            </div>
            <label className="flex items-center gap-2">
              <input
                aria-label={`${entry.label} color`}
                type="color"
                value={entry.color}
                onChange={(event) => onChange(entry.id, event.target.value)}
                className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="w-16 text-[10px] font-mono text-muted-foreground uppercase">
                {entry.color}
              </span>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

function createLegendRuleId(): string {
  return `legend:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function reorderLegendRules(
  rules: IGroup[],
  sourceIndex: number,
  targetIndex: number,
): IGroup[] {
  if (
    sourceIndex < 0
    || targetIndex < 0
    || sourceIndex >= rules.length
    || targetIndex >= rules.length
    || sourceIndex === targetIndex
  ) {
    return rules;
  }

  const nextRules = [...rules];
  const [movedRule] = nextRules.splice(sourceIndex, 1);
  if (!movedRule) {
    return rules;
  }

  nextRules.splice(targetIndex, 0, movedRule);
  return nextRules;
}

function ruleTargetLabel(target: LegendRuleTarget): string {
  switch (target) {
    case 'both':
      return 'Both';
    case 'edge':
      return 'Edge';
    default:
      return 'Node';
  }
}

function resolveLegendRuleTarget(rule: IGroup): LegendRuleTarget {
  return rule.target ?? 'node';
}

function sendUserLegendRules(
  rules: IGroup[],
  setOptimisticUserGroups: (groups: IGroup[]) => void,
): void {
  setOptimisticUserGroups(rules);
  postMessage({
    type: 'UPDATE_GROUPS',
    payload: { groups: rules },
  });
}

interface LegendRulesSectionProps {
  rules: IGroup[];
  setOptimisticUserGroups: (groups: IGroup[]) => void;
}

function LegendRulesSection({
  rules,
  setOptimisticUserGroups,
}: LegendRulesSectionProps): React.ReactElement {
  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [newTarget, setNewTarget] = useState<LegendRuleTarget>('node');
  const [draggingRuleId, setDraggingRuleId] = useState<string | null>(null);

  const updateRules = (nextRules: IGroup[]) => {
    sendUserLegendRules(nextRules, setOptimisticUserGroups);
  };

  const addRule = () => {
    const pattern = newPattern.trim();
    if (!pattern) {
      return;
    }

    updateRules([
      ...rules,
      {
        id: createLegendRuleId(),
        pattern,
        color: newColor,
        target: newTarget,
      },
    ]);
    setNewPattern('');
    setNewColor('#3B82F6');
    setNewTarget('node');
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Rules
        </h3>
        <span className="text-[10px] text-muted-foreground">
          Top overrides bottom
        </span>
      </div>

      <div className="rounded border bg-background/40 p-2 space-y-2">
        <input
          value={newPattern}
          onChange={(event) => setNewPattern(event.target.value)}
          placeholder="Pattern, e.g. */tests/**"
          className="h-8 w-full rounded border bg-background px-2 text-xs"
          aria-label="New legend rule pattern"
        />
        <div className="flex items-center gap-2">
          <select
            aria-label="New legend rule target"
            value={newTarget}
            onChange={(event) => setNewTarget(event.target.value as LegendRuleTarget)}
            className="h-8 min-w-0 flex-1 rounded border bg-background px-2 text-xs"
          >
            <option value="node">Node</option>
            <option value="edge">Edge</option>
            <option value="both">Both</option>
          </select>
          <input
            aria-label="New legend rule color"
            type="color"
            value={newColor}
            onChange={(event) => setNewColor(event.target.value)}
            className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <Button
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={addRule}
            title="Add legend rule"
          >
            <MdiIcon path={mdiPlus} size={14} />
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          No custom legend rules yet.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, index) => {
            const ruleTarget = resolveLegendRuleTarget(rule);

            return (
              <div
                key={rule.id}
                draggable
                onDragStart={() => setDraggingRuleId(rule.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceIndex = rules.findIndex((candidate) => candidate.id === draggingRuleId);
                  if (sourceIndex === -1) {
                    return;
                  }

                  updateRules(reorderLegendRules(rules, sourceIndex, index));
                  setDraggingRuleId(null);
                }}
                onDragEnd={() => setDraggingRuleId(null)}
                className="rounded border bg-background/40 p-2 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="cursor-grab text-[10px] text-muted-foreground" title="Drag to reorder">
                    {index + 1}
                  </span>
                  <input
                    value={rule.pattern}
                    onChange={(event) => {
                      updateRules(
                        rules.map((candidate) =>
                          candidate.id === rule.id
                            ? { ...candidate, pattern: event.target.value }
                            : candidate,
                        ),
                      );
                    }}
                    aria-label={`Legend rule pattern ${index + 1}`}
                    className="h-8 min-w-0 flex-1 rounded border bg-background px-2 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Delete legend rule"
                    onClick={() => {
                      updateRules(rules.filter((candidate) => candidate.id !== rule.id));
                    }}
                  >
                    <MdiIcon path={mdiDelete} size={14} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    aria-label={`Legend rule target ${index + 1}`}
                    value={ruleTarget}
                    onChange={(event) => {
                      updateRules(
                        rules.map((candidate) =>
                          candidate.id === rule.id
                            ? {
                              ...candidate,
                              target: event.target.value as LegendRuleTarget,
                            }
                            : candidate,
                        ),
                      );
                    }}
                    className="h-8 min-w-0 flex-1 rounded border bg-background px-2 text-xs"
                  >
                    <option value="node">Node</option>
                    <option value="edge">Edge</option>
                    <option value="both">Both</option>
                  </select>
                  <div className="w-14 text-[10px] text-muted-foreground text-right">
                    {ruleTargetLabel(ruleTarget)}
                  </div>
                  <input
                    aria-label={`Legend rule color ${index + 1}`}
                    type="color"
                    value={rule.color}
                    onChange={(event) => {
                      updateRules(
                        rules.map((candidate) =>
                          candidate.id === rule.id
                            ? { ...candidate, color: event.target.value }
                            : candidate,
                        ),
                      );
                    }}
                    className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <Switch
                    checked={!rule.disabled}
                    onCheckedChange={(enabled) => {
                      updateRules(
                        rules.map((candidate) =>
                          candidate.id === rule.id
                            ? { ...candidate, disabled: !enabled }
                            : candidate,
                        ),
                      );
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

interface LegendsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegendsPanel({
  isOpen,
  onClose,
}: LegendsPanelProps): React.ReactElement | null {
  const nodeTypes = useGraphStore((state) => state.graphNodeTypes);
  const edgeTypes = useGraphStore((state) => state.graphEdgeTypes);
  const nodeColors = useGraphStore((state) => state.nodeColors);
  const edgeColors = useGraphStore((state) => state.edgeColors);
  const groups = useGraphStore((state) => state.groups);
  const setOptimisticUserGroups = useGraphStore((state) => state.setOptimisticUserGroups);

  const userLegendRules = useMemo(
    () => groups.filter((group) => !group.isPluginDefault),
    [groups],
  );

  if (!isOpen) {
    return null;
  }

  const nodeEntries = nodeTypes.map((nodeType) => ({
    id: nodeType.id,
    label: nodeType.label,
    color: nodeColors[nodeType.id] ?? nodeType.defaultColor,
  }));
  const edgeEntries = edgeTypes.map((edgeType) => ({
    id: edgeType.id,
    label: edgeType.label,
    color: edgeColors[edgeType.id] ?? edgeType.defaultColor,
  }));

  return (
    <div className="bg-popover/95 backdrop-blur-sm rounded-lg border w-72 shadow-lg max-h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Legends</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-4 px-3 pb-3 pt-2">
          <LegendColorSection
            title="Nodes"
            entries={nodeEntries}
            onChange={(nodeType, color) => {
              postMessage({
                type: 'UPDATE_NODE_COLOR',
                payload: { nodeType, color },
              });
            }}
          />
          <LegendColorSection
            title="Edges"
            entries={edgeEntries}
            onChange={(edgeKind, color) => {
              postMessage({
                type: 'UPDATE_EDGE_COLOR',
                payload: { edgeKind, color },
              });
            }}
          />
          <LegendRulesSection
            rules={userLegendRules}
            setOptimisticUserGroups={setOptimisticUserGroups}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
