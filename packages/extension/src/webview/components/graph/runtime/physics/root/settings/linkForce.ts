import type { IPhysicsSettings } from '../../../../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import { hasDistanceAndStrength } from '../../../../support/guards';
import { getGraphLinkStrength } from '../../bridge/endpoints';
import type { GraphPhysicsControls } from '../../model';

export function applyLinkSettings(
	graph: GraphPhysicsControls,
	settings: IPhysicsSettings,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const linkForce = graph.d3Force('link');
	if (hasDistanceAndStrength(linkForce)) {
		linkForce.distance(settings.linkDistance);
		linkForce.strength(getGraphLinkStrength(settings.linkForce, graphLayout));
	}
}
