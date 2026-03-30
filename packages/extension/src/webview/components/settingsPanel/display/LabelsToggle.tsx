import React from 'react';
import { Label } from '../../ui/form/label';
import { Switch } from '../../ui/switch';

type LabelsToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function LabelsToggle({
  checked,
  onCheckedChange,
}: LabelsToggleProps): React.ReactElement {
  const handleCheckedChange = (nextValue: boolean) => {
    if (typeof onCheckedChange !== 'function') {
      return;
    }

    onCheckedChange(nextValue);
  };

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="show-labels" className="text-xs">
        Show Labels
      </Label>
      <Switch
        id="show-labels"
        checked={checked}
        onCheckedChange={handleCheckedChange}
      />
    </div>
  );
}
