import React from 'react';
import type { IGroup } from '../../../../../shared/settings/groups';
import type { LegendRuleChange } from './contracts';
import {
  RuleColorControl,
  RuleDeleteControl,
  RuleDragHandle,
  RuleVisibilitySwitch,
  RuleVisualControls,
} from './ruleControls';
import { RulePatternCell } from './rulePattern';

interface LegendRuleRowProps {
  rule: IGroup;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onChange: LegendRuleChange;
  onRemove: () => void;
  onToggleDefaultVisibility: (legendId: string, visible: boolean) => void;
}

function getRuleRowClassName(isDragOver: boolean, isDragging: boolean): string {
  return [
    'transition-colors',
    isDragOver ? 'bg-accent/30' : '',
    isDragging ? 'opacity-60' : '',
  ].join(' ').trim();
}

export function LegendRuleRow({
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
}: LegendRuleRowProps): React.ReactElement {
  return (
    <div
      data-testid="legend-rule-row"
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={getRuleRowClassName(isDragOver, isDragging)}
    >
      <div className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-accent/20">
        <RuleDragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
        <RulePatternCell rule={rule} index={index} onChange={onChange} />
        <RuleVisualControls rule={rule} index={index} onChange={onChange} />
        <RuleColorControl rule={rule} index={index} onChange={onChange} />
        <RuleVisibilitySwitch
          rule={rule}
          onChange={onChange}
          onToggleDefaultVisibility={onToggleDefaultVisibility}
        />
        <RuleDeleteControl rule={rule} onRemove={onRemove} />
      </div>
    </div>
  );
}
