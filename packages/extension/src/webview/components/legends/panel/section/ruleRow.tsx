import React from 'react';
import { mdiDelete } from '@mdi/js';
import type { IGroup } from '../../../../../shared/settings/groups';
import { MdiIcon } from '../../../icons/MdiIcon';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Switch } from '../../../ui/switch';
import { LegendColorInput } from './colorInput';

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
