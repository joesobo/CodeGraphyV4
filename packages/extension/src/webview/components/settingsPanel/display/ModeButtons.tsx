import React from 'react';
import type { ButtonProps } from '../../ui/button';
import { Button } from '../../ui/button';
import { Label } from '../../ui/form/label';
import { cn } from '../../ui/cn';

export type ModeButtonOption<Value extends string> = {
  label: string;
  pressed: boolean;
  value: Value;
  variant: ButtonProps['variant'];
};

type ModeButtonsProps<Value extends string> = {
  className?: string;
  label: string;
  onSelect: (value: Value) => void;
  options: ModeButtonOption<Value>[];
};

export function ModeButtons<Value extends string>({
  className,
  label,
  onSelect,
  options,
}: ModeButtonsProps<Value>): React.ReactElement {
  const handleSelect = (value: Value) => {
    if (typeof onSelect !== 'function') {
      return;
    }

    onSelect(value);
  };

  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex gap-1">
        {options.map((option) => (
          <Button
            key={option.value}
            aria-pressed={option.pressed}
            variant={option.variant}
            size="sm"
            className={cn('h-6 min-w-0 px-2 text-xs flex-1', option.label.length > 8 ? 'px-1' : undefined)}
            onClick={() => handleSelect(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
