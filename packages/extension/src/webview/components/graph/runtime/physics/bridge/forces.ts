import type { IPhysicsSettings } from '../../../../../../shared/settings/physics';
import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGLink, FGNode } from '../../../model/build';
import { SECTION_BRIDGE_LINK_MAX_IMPULSE } from '../model';
import { isMemberPressedTowardSectionEdge } from './memberEdge';
import { getExternalBridgeEndpoint, touchesExpandedSectionMember } from './sectionEndpoint';
import { applyLinkVelocity, getBridgeLinkNodePair, hasBridgePhysicsSettings } from './linkForces';
import { getNodeDelta } from '../motion';
import { getSectionBounds } from '../section/bounds';
import { createNodeMap } from '../nodeLookup';

function getBridgeSectionLinkDistance(
	sectionNode: FGNode,
	memberNode: FGNode,
	linkDistance: number,
): number {
	const centerToMemberDistance = getNodeDelta(sectionNode, memberNode).distance;
	return linkDistance + centerToMemberDistance;
}

function applyExpandedSectionBridgePull(
	source: FGNode,
	target: FGNode,
	nodeMap: Map<string, FGNode>,
	graphLayout: GraphLayoutSettings,
	linkDistance: number,
	linkForce: number,
	alpha: number,
): void {
	const bridge = getExternalBridgeEndpoint(source, target, graphLayout);
	if (!bridge) {
		return;
	}

	const ownerSectionNode = nodeMap.get(bridge.ownerSectionId);
	const ownerSectionBounds = getSectionBounds(ownerSectionNode, bridge.ownerSectionId, graphLayout);
	if (!ownerSectionNode || !ownerSectionBounds || !isMemberPressedTowardSectionEdge(bridge.memberNode, bridge.externalNode, ownerSectionBounds)) {
		return;
	}

	applyLinkVelocity(
		ownerSectionNode,
		bridge.externalNode,
		getBridgeSectionLinkDistance(ownerSectionNode, bridge.memberNode, linkDistance),
		linkForce,
		alpha,
		SECTION_BRIDGE_LINK_MAX_IMPULSE,
	);
}

export function applySectionBridgeLinkForces(
	nodes: readonly FGNode[],
	graphLayout: GraphLayoutSettings,
	links: readonly FGLink[],
	settings: Pick<IPhysicsSettings, 'linkDistance' | 'linkForce'> | undefined,
	alpha: number,
): void {
	if (!hasBridgePhysicsSettings(links, settings)) {
		return;
	}

	const nodeMap = createNodeMap(nodes);
	for (const link of links) {
		const pair = getBridgeLinkNodePair(link, nodeMap);
		if (!pair) {
			continue;
		}

		const [source, target] = pair;
		if (!touchesExpandedSectionMember(source, target, graphLayout)) {
			continue;
		}

		applyLinkVelocity(source, target, settings.linkDistance, settings.linkForce, alpha, SECTION_BRIDGE_LINK_MAX_IMPULSE);
		applyExpandedSectionBridgePull(source, target, nodeMap, graphLayout, settings.linkDistance, settings.linkForce, alpha);
	}
}
