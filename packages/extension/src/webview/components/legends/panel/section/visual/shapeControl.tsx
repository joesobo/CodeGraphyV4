import React from 'react';
import type { IGroup } from '../../../../../../shared/settings/groups';
import { MdiIcon } from '../../../../icons/MdiIcon';
import { Button } from '../../../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../ui/overlay/popover';
import type { LegendRuleChange } from '../contracts';
import { SHAPE_OPTIONS } from './options';
import { canEditRuleVisual } from './permissions';
import { ShapePreview } from './previews';
import { applyShape, getShapeOption } from './shapeModel';

export function LegendShapeControl({
  editable,
  rule,
  title,
  onChange,
}: {
  editable: boolean;
  rule: IGroup;
  title: string;
  onChange: LegendRuleChange;
}): React.ReactElement {
  const option = getShapeOption(rule);
  const label = rule.displayLabel ?? rule.pattern;

  if (!canEditRuleVisual(editable, rule)) {
    return <ShapePreview label={`${label} shape: ${option.shape2D}`} option={option} />;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 border-[var(--cg-border-subtle)] bg-[var(--cg-surface-muted)] text-muted-foreground hover:bg-[var(--cg-accent-subtle)] hover:text-foreground"
          title={title}
        >
          <MdiIcon path={option.icon} size={15} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {SHAPE_OPTIONS.map((shapeOption) => (
            <Button
              key={shapeOption.shape2D}
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={`Use ${shapeOption.shape2D} shape`}
              onClick={() => onChange(applyShape(rule, shapeOption))}
            >
              <MdiIcon path={shapeOption.icon} size={15} />
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
