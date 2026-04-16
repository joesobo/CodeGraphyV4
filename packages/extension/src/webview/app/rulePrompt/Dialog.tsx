import React from 'react';
import { mdiClose } from '@mdi/js';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { MdiIcon } from '../../components/icons/MdiIcon';

interface RulePromptDialogProps {
  title: string;
  pattern: string;
  color: string;
  isLegend: boolean;
  onClose: () => void;
  onSave: () => void;
  onPatternChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

export function RulePromptDialog({
  title,
  pattern,
  color,
  isLegend,
  onClose,
  onSave,
  onPatternChange,
  onColorChange,
}: RulePromptDialogProps): React.ReactElement {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-lg border bg-popover/95 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">{title}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
            <MdiIcon path={mdiClose} size={16} />
          </Button>
        </div>
        <div className="space-y-3 px-3 py-3">
          <Input
            autoFocus
            aria-label={`${title} pattern`}
            value={pattern}
            onChange={(event) => onPatternChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSave();
              }
            }}
          />
          {isLegend ? (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground" htmlFor="legend-rule-color">
                Color
              </label>
              <input
                id="legend-rule-color"
                aria-label="Legend rule color"
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0"
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
