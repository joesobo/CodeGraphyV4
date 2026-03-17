import React from 'react';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

export function OrphansToggle({
  onCheckedChange,
  showOrphans,
}: {
  onCheckedChange: (checked: boolean) => void;
  showOrphans: boolean;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between py-0.5">
      <Label htmlFor="show-orphans" className="text-xs">
        Show Orphans
      </Label>
      <Switch
        id="show-orphans"
        checked={showOrphans}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
