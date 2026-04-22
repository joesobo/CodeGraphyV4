import React from 'react';
import { mdiDelete, mdiDragVertical } from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import { MdiIcon } from '../../../icons/MdiIcon';
import { Button } from '../../../ui/button';
import { Switch } from '../../../ui/switch';
import { LegendColorInput } from './colorInput';
import type { LegendRuleChange } from './contracts';
import { LegendIconControl, LegendShapeControl } from './visual';

function getRuleLabel(rule: IGroup): string {
  return rule.displayLabel ?? rule.pattern;
}

export function RuleDragHandle({
  onDragStart = () => {},
  onDragEnd = () => {},
}: {
  onDragStart?: (event: React.DragEvent<HTMLSpanElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLSpanElement>) => void;
}): React.ReactElement {
  return (
    <span
      draggable
      className="inline-flex h-7 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground"
      title="Drag legend rule"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <MdiIcon path={mdiDragVertical} size={15} />
    </span>
  );
}

export function RuleVisualControls({
  rule,
  index,
  onChange,
}: {
  rule: IGroup;
  index: number;
  onChange: LegendRuleChange;
}): React.ReactElement {
  const editable = rule.isPluginDefault !== true;

  return (
    <>
      <LegendIconControl
        editable={editable}
        index={index}
        rule={rule}
        title="Upload legend icon"
        onChange={onChange}
      />
      <LegendShapeControl
        editable={editable}
        rule={rule}
        title="Choose legend shape"
        onChange={onChange}
      />
    </>
  );
}

export function RuleColorControl({
  rule,
  index,
  onChange,
}: {
  rule: IGroup;
  index: number;
  onChange: LegendRuleChange;
}): React.ReactElement {
  if (rule.isPluginDefault === true) {
    return (
      <span
        className="h-5 w-8 shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: rule.color }}
        aria-hidden="true"
      />
    );
  }

  return (
    <LegendColorInput
      ariaLabel={`Legend color ${index + 1}`}
      color={rule.color}
      onCommit={(color) => onChange({ ...rule, color })}
    />
  );
}

export function RuleVisibilitySwitch({
  rule,
  onChange,
  onToggleDefaultVisibility,
}: {
  rule: IGroup;
  onChange: LegendRuleChange;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}): React.ReactElement {
  const label = getRuleLabel(rule);

  return (
    <Switch
      checked={!rule.disabled}
      title={`Toggle ${label} legend entry`}
      aria-label={`Toggle ${label} legend entry`}
      onCheckedChange={(enabled) => {
        if (rule.isPluginDefault === true) {
          onToggleDefaultVisibility(rule.id, enabled);
          return;
        }
        onChange({ ...rule, disabled: !enabled });
      }}
    />
  );
}

function DeleteRuleButton({ onRemove }: { onRemove: () => void }): React.ReactElement {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      title="Delete legend rule"
      onClick={onRemove}
    >
      <MdiIcon path={mdiDelete} size={14} />
    </Button>
  );
}

export function RuleDeleteControl({
  rule,
  onRemove,
}: {
  rule: IGroup;
  onRemove: () => void;
}): React.ReactElement | null {
  if (rule.isPluginDefault === true) {
    return null;
  }

  return <DeleteRuleButton onRemove={onRemove} />;
}
