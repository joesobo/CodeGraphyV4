import type { IPhysicsSettings } from '../../../../../shared/settings/physics';
import { havePhysicsSettingsChanged } from '../physics';
import type { ActivePhysicsGraph } from './readiness';

export function shouldApplyPhysicsUpdate({
  graph,
  haveSettingsChanged = havePhysicsSettingsChanged,
  physicsInitialised,
  physicsSettings,
  previousPhysics,
}: {
  graph: ActivePhysicsGraph | undefined;
  haveSettingsChanged?: (
    previous: IPhysicsSettings | null,
    next: IPhysicsSettings,
  ) => boolean;
  physicsInitialised: boolean;
  physicsSettings: IPhysicsSettings;
  previousPhysics: IPhysicsSettings | null;
}): boolean {
  if (!graph || !physicsInitialised) return false;
  return haveSettingsChanged(previousPhysics, physicsSettings);
}
