import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';

export function havePhysicsSettingsChanged(
	previous: IPhysicsSettings | null,
	next: IPhysicsSettings,
): boolean {
	return !previous
		|| previous.repelForce !== next.repelForce
		|| previous.centerForce !== next.centerForce
		|| previous.linkDistance !== next.linkDistance
		|| previous.linkForce !== next.linkForce
		|| previous.damping !== next.damping;
}
