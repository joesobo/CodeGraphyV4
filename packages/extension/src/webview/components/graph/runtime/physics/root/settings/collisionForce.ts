import type { GraphLayoutSettings } from '../../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../../model/build';
import type { GraphPhysicsControls } from '../../model';
import { getRootGraphCollisionRadius } from '../collision';
import { hasRadius } from './guards';

export function applyCollisionSettings(
	graph: GraphPhysicsControls,
	graphLayout: GraphLayoutSettings | undefined,
): void {
	const collisionForce = graph.d3Force('collision');
	if (hasRadius(collisionForce)) {
		collisionForce.radius((node: FGNode) => getRootGraphCollisionRadius(node, graphLayout));
	}
}
