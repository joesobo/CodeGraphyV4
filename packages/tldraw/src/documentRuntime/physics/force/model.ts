import type { ForceSettings } from '../../forceControls/model';

export function forceSettingsChanged(current: ForceSettings, next: ForceSettings): boolean {
  return current.repelForce !== next.repelForce
    || current.centerForce !== next.centerForce
    || current.linkDistance !== next.linkDistance
    || current.linkForce !== next.linkForce;
}
