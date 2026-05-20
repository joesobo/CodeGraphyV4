import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import { hasDistanceAndStrength } from '../../../../support/guards';
import type { GraphPhysicsControls } from '../../model';

export function applyLinkSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
): void {
	const linkForce = graph.d3Force('link');
	if (hasDistanceAndStrength(linkForce)) {
		linkForce.distance(settings.linkDistance);
		linkForce.strength(settings.linkForce);
	}
}
