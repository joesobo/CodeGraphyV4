import type { ReactElement } from 'react';
import { Label } from '../../ui/form/label';
import { Switch } from '../../ui/switch';

export function MinimapToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange(this: void, checked: boolean): void;
}): ReactElement {
  return (
    <div className="flex items-center justify-between py-0.5">
      <Label htmlFor="show-minimap" className="text-xs">
        Show Minimap
      </Label>
      <Switch
        id="show-minimap"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
