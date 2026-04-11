import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  mdiChevronDown,
  mdiChevronUp,
  mdiClose,
  mdiDelete,
  mdiPlus,
} from '@mdi/js';
import type { IGroup } from '../../../shared/settings/groups';
import { useGraphStore } from '../../store/state';
import { postMessage } from '../../vscodeApi';
import { MdiIcon } from '../icons/MdiIcon';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/disclosure/collapsible';

const COLOR_DEBOUNCE_MS = 150;

type LegendTargetSection = 'node' | 'edge';

interface LegendBuiltInEntry {
  id: string;
  label: string;
  color: string;
}

type LegendDisplayRule = IGroup;

function createLegendRuleId(): string {
  return `legend:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function shouldRenderRuleInSection(rule: IGroup, target: LegendTargetSection): boolean {
  const ruleTarget = rule.target ?? 'node';
  if (target === 'edge') {
    return ruleTarget !== 'node';
  }

  return ruleTarget !== 'edge';
}

function replaceSectionRules(
  rules: IGroup[],
  target: LegendTargetSection,
  nextSectionRules: IGroup[],
): IGroup[] {
  const remainingRules = rules.filter(rule => !shouldRenderRuleInSection(rule, target));
  return [...remainingRules, ...nextSectionRules];
}

function resolveDisplayRules(
  legends: IGroup[],
  target: LegendTargetSection,
): LegendDisplayRule[] {
  const sectionRules = legends.filter((rule) => shouldRenderRuleInSection(rule, target));
  const rulesById = new Map<string, LegendDisplayRule>();

  for (const rule of sectionRules) {
    const existing = rulesById.get(rule.id);
    if (!existing) {
      rulesById.set(rule.id, rule);
      continue;
    }

    rulesById.set(rule.id, {
      ...rule,
      ...existing,
      isPluginDefault: rule.isPluginDefault || existing.isPluginDefault,
      pluginName: existing.pluginName ?? rule.pluginName,
      imagePath: existing.imagePath ?? rule.imagePath,
      imageUrl: existing.imageUrl ?? rule.imageUrl,
    });
  }

  return [...rulesById.values()];
}

function reorderItems<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= items.length
    || toIndex >= items.length
    || fromIndex === toIndex
  ) {
    return [...items];
  }

  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return reordered;
}

function sendUserLegendRules(
  rules: IGroup[],
  setOptimisticUserLegends: (legends: IGroup[]) => void,
): void {
  setOptimisticUserLegends(rules);
  postMessage({
    type: 'UPDATE_LEGENDS',
    payload: { legends: rules },
  });
}

function LegendColorInput({
  ariaLabel,
  color,
  onCommit,
  immediate = false,
}: {
  ariaLabel: string;
  color: string;
  onCommit: (color: string) => void;
  immediate?: boolean;
}): React.ReactElement {
  const [draftColor, setDraftColor] = useState(color);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingColorRef = useRef(color);

  useEffect(() => {
    setDraftColor(color);
    pendingColorRef.current = color;
  }, [color]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const commitColor = (nextColor: string): void => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    onCommit(nextColor);
  };

  return (
    <label
      className="relative block h-5 w-8 shrink-0 overflow-hidden rounded-sm border border-black/10 cursor-pointer"
      style={{ backgroundColor: draftColor }}
    >
      <input
        aria-label={ariaLabel}
        type="color"
        value={draftColor}
        onChange={(event) => {
          const nextColor = event.target.value;
          setDraftColor(nextColor);
          pendingColorRef.current = nextColor;
          if (immediate) {
            commitColor(nextColor);
            return;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            commitColor(nextColor);
          }, COLOR_DEBOUNCE_MS);
        }}
        onBlur={() => {
          if (pendingColorRef.current !== color) {
            commitColor(pendingColorRef.current);
          }
        }}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </label>
  );
}

function LegendBuiltInRow({
  entry,
  onChange,
}: {
  entry: LegendBuiltInEntry;
  onChange: (id: string, color: string) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/20">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium" title={entry.label}>
          {entry.label}
        </div>
      </div>
      <LegendColorInput
        ariaLabel={`${entry.label} color`}
        color={entry.color}
        onCommit={(color) => onChange(entry.id, color)}
      />
    </div>
  );
}

function LegendRuleRow({
  rule,
  index,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onChange,
  onRemove,
  onToggleDefaultVisibility,
}: {
  rule: IGroup;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onChange: (rule: IGroup) => void;
  onRemove: () => void;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  const isPluginDefault = rule.isPluginDefault === true;

  return (
    <div
      data-testid="legend-rule-row"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        'transition-colors',
        isDragOver ? 'bg-accent/30' : '',
        isDragging ? 'opacity-60' : '',
      ].join(' ').trim()}
    >
      <div className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-accent/20">
        <div className="min-w-0 flex-1">
          {isPluginDefault ? (
            <div className="break-all text-xs font-medium leading-5" title={rule.pattern}>
              {rule.pattern}
            </div>
          ) : (
            <Input
              value={rule.pattern}
              onChange={(event) => {
                onChange({ ...rule, pattern: event.target.value });
              }}
              title={rule.pattern}
              aria-label={`Legend pattern ${index + 1}`}
              className="h-7 min-w-0 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
            />
          )}
        </div>
        {isPluginDefault ? (
          <span
            className="h-5 w-8 shrink-0 rounded-sm border border-black/10"
            style={{ backgroundColor: rule.color }}
            aria-hidden="true"
          />
        ) : (
          <LegendColorInput
            ariaLabel={`Legend color ${index + 1}`}
            color={rule.color}
            onCommit={(color) => onChange({ ...rule, color })}
          />
        )}
        <Switch
          checked={!rule.disabled}
          onCheckedChange={(enabled) => {
            if (isPluginDefault) {
              onToggleDefaultVisibility(rule.id, enabled);
              return;
            }
            onChange({ ...rule, disabled: !enabled });
          }}
        />
        {!isPluginDefault ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            title="Delete legend rule"
            onClick={onRemove}
          >
            <MdiIcon path={mdiDelete} size={14} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function LegendRuleCreateRow({
  target,
  onAdd,
}: {
  target: LegendTargetSection;
  onAdd: (rule: IGroup) => void;
}): React.ReactElement {
  const [pattern, setPattern] = useState('');
  const [color, setColor] = useState('#3B82F6');

  return (
    <div className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/20">
      <div className="min-w-0 flex-1">
        <Input
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          placeholder="Pattern, e.g. */tests/**"
          className="h-7 min-w-0 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
          aria-label={`New ${target} legend pattern`}
        />
      </div>
      <LegendColorInput
        ariaLabel={`New ${target} legend color`}
        color={color}
        onCommit={setColor}
        immediate={true}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7 shrink-0 border-border/60 bg-background/20 p-0 text-muted-foreground hover:bg-accent/20 hover:text-foreground"
        onClick={() => {
          const nextPattern = pattern.trim();
          if (!nextPattern) {
            return;
          }

          onAdd({
            id: createLegendRuleId(),
            pattern: nextPattern,
            color,
            target,
          });
          setPattern('');
          setColor('#3B82F6');
        }}
        title={`Add ${target} legend`}
      >
        <MdiIcon path={mdiPlus} size={14} />
      </Button>
    </div>
  );
}

function LegendSection({
  title,
  builtInEntries,
  displayRules,
  userRules,
  legends,
  target,
  onBuiltInColorChange,
  onRulesChange,
  onToggleDefaultVisibility,
}: {
  title: string;
  builtInEntries: LegendBuiltInEntry[];
  displayRules: LegendDisplayRule[];
  userRules: IGroup[];
  legends: IGroup[];
  target: LegendTargetSection;
  onBuiltInColorChange: (id: string, color: string) => void;
  onRulesChange: (rules: IGroup[]) => void;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDropRule = (event: React.DragEvent<HTMLDivElement>, targetIndex: number): void => {
    event.preventDefault();
    if (dragIndex === null) {
      setDragOverIndex(null);
      return;
    }

    const reorderedSectionRuleIds = reorderItems(displayRules, dragIndex, targetIndex).map(
      rule => rule.id,
    );
    const otherSectionTarget: LegendTargetSection = target === 'node' ? 'edge' : 'node';
    const otherSectionRuleIds = resolveDisplayRules(legends, otherSectionTarget).map(rule => rule.id);
    const legendIds =
      target === 'node'
        ? [...reorderedSectionRuleIds, ...otherSectionRuleIds]
        : [...otherSectionRuleIds, ...reorderedSectionRuleIds];

    postMessage({
      type: 'UPDATE_LEGEND_ORDER',
      payload: { legendIds },
    });
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="space-y-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-accent/10"
            title={`Toggle ${title} legend section`}
          >
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </h3>
            <MdiIcon path={open ? mdiChevronUp : mdiChevronDown} size={16} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="overflow-hidden rounded-md border border-border/60 bg-background/10 divide-y divide-border/50">
            {builtInEntries.map((entry) => (
              <LegendBuiltInRow
                key={entry.id}
                entry={entry}
                onChange={onBuiltInColorChange}
              />
            ))}
            {displayRules.map((rule, index) => (
              <LegendRuleRow
                key={rule.id}
                rule={rule}
                index={index}
                isDragging={dragIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverIndex(index);
                }}
                onDrop={(event) => handleDropRule(event, index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onChange={(nextRule) => {
                  const targetRules = userRules.filter((candidate) =>
                    shouldRenderRuleInSection(candidate, target),
                  );
                  onRulesChange(
                    targetRules.map((candidate) => (candidate.id === nextRule.id ? nextRule : candidate)),
                  );
                }}
                onRemove={() => {
                  onRulesChange(userRules.filter((candidate) => candidate.id !== rule.id));
                }}
                onToggleDefaultVisibility={onToggleDefaultVisibility}
              />
            ))}
            <LegendRuleCreateRow
              target={target}
              onAdd={(rule) => {
                onRulesChange([...userRules, rule]);
              }}
            />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
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
  const legends = useGraphStore((state) => state.legends);
  const setOptimisticLegendUpdate = useGraphStore((state) => state.setOptimisticLegendUpdate);
  const setOptimisticUserLegends = useGraphStore((state) => state.setOptimisticUserLegends);

  const userLegendRules = useMemo(
    () => legends.filter((group) => !group.isPluginDefault),
    [legends],
  );
  const nodeLegendRules = useMemo(
    () => userLegendRules.filter((rule) => shouldRenderRuleInSection(rule, 'node')),
    [userLegendRules],
  );
  const edgeLegendRules = useMemo(
    () => userLegendRules.filter((rule) => shouldRenderRuleInSection(rule, 'edge')),
    [userLegendRules],
  );
  const displayedNodeLegendRules = useMemo(
    () => resolveDisplayRules(legends, 'node'),
    [legends],
  );
  const displayedEdgeLegendRules = useMemo(
    () => resolveDisplayRules(legends, 'edge'),
    [legends],
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
          <LegendSection
            title="Nodes"
            builtInEntries={nodeEntries}
            displayRules={displayedNodeLegendRules}
            userRules={nodeLegendRules}
            legends={legends}
            target="node"
            onBuiltInColorChange={(nodeType, color) => {
              postMessage({
                type: 'UPDATE_NODE_COLOR',
                payload: { nodeType, color },
              });
            }}
            onRulesChange={(nextSectionRules) => {
              sendUserLegendRules(
                replaceSectionRules(userLegendRules, 'node', nextSectionRules),
                setOptimisticUserLegends,
              );
            }}
            onToggleDefaultVisibility={(legendId, visible) => {
              setOptimisticLegendUpdate(legendId, { disabled: !visible });
              postMessage({
                type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
                payload: { legendId, visible },
              });
            }}
          />
          <LegendSection
            title="Edges"
            builtInEntries={edgeEntries}
            displayRules={displayedEdgeLegendRules}
            userRules={edgeLegendRules}
            legends={legends}
            target="edge"
            onBuiltInColorChange={(edgeKind, color) => {
              postMessage({
                type: 'UPDATE_EDGE_COLOR',
                payload: { edgeKind, color },
              });
            }}
            onRulesChange={(nextSectionRules) => {
              sendUserLegendRules(
                replaceSectionRules(userLegendRules, 'edge', nextSectionRules),
                setOptimisticUserLegends,
              );
            }}
            onToggleDefaultVisibility={(legendId, visible) => {
              setOptimisticLegendUpdate(legendId, { disabled: !visible });
              postMessage({
                type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY',
                payload: { legendId, visible },
              });
            }}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
