import React from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/form/label';

type ColorFieldProps = {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
};

export function ColorField({
  id,
  label,
  onChange,
  value,
}: ColorFieldProps): React.ReactElement {
  const handleChange = (nextValue: string) => {
    if (typeof onChange !== 'function') {
      return;
    }

    onChange(nextValue);
  };

  return (
    <div>
      <Label htmlFor={id} className="text-xs text-muted-foreground mb-1.5 block">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          className="h-7 w-10 p-1"
        />
        <span className="text-[11px] text-muted-foreground font-mono flex-1">{value}</span>
      </div>
    </div>
  );
}
