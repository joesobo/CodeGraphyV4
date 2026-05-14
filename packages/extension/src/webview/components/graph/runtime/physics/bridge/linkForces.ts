import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { FGLink, FGNode } from '../../../model/build';
import type { CollisionWeightShares } from '../model';
import { getLinkNodePair } from './endpoints';
import { addCappedNodeVelocity, getNodeDelta } from '../motion';

function getBridgeMoveWeight(node: FGNode): number {
	return node.isDragging || node.isPinned ? 0 : 1;
}

function getBridgeWeightShares(source: FGNode, target: FGNode): CollisionWeightShares | undefined {
	const sourceWeight = getBridgeMoveWeight(source);
	const targetWeight = getBridgeMoveWeight(target);
	const totalWeight = sourceWeight + targetWeight;
	return totalWeight === 0
		? undefined
		: {
			left: sourceWeight / totalWeight,
			right: targetWeight / totalWeight,
		};
}

export function applyLinkVelocity(
	source: FGNode,
	target: FGNode,
	linkDistance: number,
	linkForce: number,
	alpha: number,
	maxImpulse = Number.POSITIVE_INFINITY,
): void {
	const weights = getBridgeWeightShares(source, target);
	if (!weights) {
		return;
	}

	const delta = getNodeDelta(source, target);
	const force = ((delta.distance - linkDistance) / delta.distance) * linkForce * alpha;
	addCappedNodeVelocity(source, delta.x * force * weights.left, delta.y * force * weights.left, maxImpulse);
	addCappedNodeVelocity(target, -delta.x * force * weights.right, -delta.y * force * weights.right, maxImpulse);
}

export function hasBridgePhysicsSettings(
	links: readonly FGLink[],
	settings: Pick<IPhysicsSettings, 'linkDistance' | 'linkForce'> | undefined,
): settings is Pick<IPhysicsSettings, 'linkDistance' | 'linkForce'> {
	return !!settings && links.length > 0 && settings.linkForce !== 0;
}

export function getBridgeLinkNodePair(
	link: FGLink,
	nodeMap: Map<string, FGNode>,
): [FGNode, FGNode] | undefined {
	return getLinkNodePair(link, nodeMap);
}
