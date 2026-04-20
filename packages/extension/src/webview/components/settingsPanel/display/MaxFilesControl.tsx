import React from 'react';
import { mdiMinus, mdiPlus } from '@mdi/js';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/form/label';

export function MaxFilesControl({
  maxFiles,
  onBlur,
  onChange,
  onDecrease,
  onIncrease,
  onKeyDown,
}: {
  maxFiles: number;
  onBlur: (value: string) => void;
  onChange: (value: string) => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-0.5">
      <Label className="text-xs">Max Files</Label>
      <div className="flex items-center gap-0.5">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={onDecrease}
          disabled={maxFiles <= 1}
          title="Decrease by 100"
        >
          <MdiIcon path={mdiMinus} size={12} />
        </Button>
        <Input
          type="text"
          inputMode="numeric"
          value={maxFiles}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => onBlur(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-6 w-14 px-1 text-center text-xs"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={onIncrease}
          title="Increase by 100"
        >
          <MdiIcon path={mdiPlus} size={12} />
        </Button>
      </div>
    </div>
  );
}
