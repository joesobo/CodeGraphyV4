import React from 'react';
import { mdiImageOff, mdiImagePlus } from '@mdi/js';
import type { IGroup } from '../../../../../../shared/settings/groups';
import { MdiIcon } from '../../../../icons/MdiIcon';
import { Button } from '../../../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../../../ui/overlay/popover';
import type { LegendRuleChange } from '../contracts';
import { clearRuleIcon, readLegendIconUpload } from './iconModel';
import { canEditRuleVisual } from './permissions';
import { IconPreview } from './previews';

function IconUploadPanel({
  index,
  rule,
  onChange,
}: {
  index: number;
  rule: IGroup;
  onChange: LegendRuleChange;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Icon
      </div>
      <input
        aria-label={`Legend icon ${index + 1}`}
        type="file"
        accept=".svg,.png,image/svg+xml,image/png"
        className="block w-full text-[11px] text-muted-foreground file:mr-2 file:rounded-sm file:border file:border-[var(--cg-border-subtle)] file:bg-[var(--cg-surface-muted)] file:px-2 file:py-1 file:text-[11px] file:text-foreground"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            readLegendIconUpload(rule, file, onChange);
          }
        }}
      />
      {rule.imagePath || rule.imageUrl ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-[11px]"
          title="Clear legend icon"
          onClick={() => onChange(clearRuleIcon(rule))}
        >
          <MdiIcon path={mdiImageOff} size={14} />
          Clear icon
        </Button>
      ) : null}
    </div>
  );
}

export function LegendIconControl({
  editable,
  index,
  rule,
  title,
  onChange,
}: {
  editable: boolean;
  index: number;
  rule: IGroup;
  title: string;
  onChange: LegendRuleChange;
}): React.ReactElement | null {
  const label = rule.displayLabel ?? rule.pattern;

  if (!canEditRuleVisual(editable, rule)) {
    return rule.imageUrl
      ? (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-muted)] text-muted-foreground">
            <IconPreview imageUrl={rule.imageUrl} label={label} />
          </span>
        )
      : null;
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
          {rule.imageUrl
            ? <IconPreview imageUrl={rule.imageUrl} label={label} />
            : <MdiIcon path={mdiImagePlus} size={15} />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <IconUploadPanel index={index} rule={rule} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
