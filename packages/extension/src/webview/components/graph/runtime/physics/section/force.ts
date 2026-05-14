import type { GraphLayoutSettings } from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { applySectionBridgeLinkForces } from '../bridge/forces';
import { carrySectionMembersWithFrames } from '../member/movement/carry';
import { isolateSectionMemberVelocities, rememberSectionCenters, rememberSectionMemberPositions } from '../member/movement/velocity';
import { getSectionMemberCenterStrength } from '../member/simulation/settings';
import type { GraphSectionBoundsForce, GraphSectionBoundsForceOptions, SectionCenter, SectionMemberPosition } from '../model';
import { createSectionBoundsMap } from './bounds';
import { applyRectangleCollisions } from '../rectangle/collision/apply';
import { getVelocityIntegrationDecay } from '../rectangle/collision/repel';
import { constrainPassiveRootNodesOutsideSections } from '../root/boundary/constrain';
import { applyLocalSectionMemberForces, constrainSectionMembers } from './memberForces';

function applyGraphSectionBoundsTick(
	nodes: FGNode[],
	graphLayout: GraphLayoutSettings,
	options: GraphSectionBoundsForceOptions,
	previousSectionCenters: Map<string, SectionCenter>,
	previousSectionMemberPositions: Map<string, SectionMemberPosition>,
	alpha: number,
): void {
	isolateSectionMemberVelocities(nodes, graphLayout, previousSectionMemberPositions);
	applySectionBridgeLinkForces(nodes, graphLayout, options.links ?? [], options.settings, alpha);
	applyRectangleCollisions(nodes, graphLayout, options.settings);
	carrySectionMembersWithFrames(nodes, graphLayout, previousSectionCenters);
	const sectionBounds = createSectionBoundsMap(nodes, graphLayout);
	constrainPassiveRootNodesOutsideSections(nodes, graphLayout, sectionBounds, getVelocityIntegrationDecay(options.settings));
	const sectionMemberCenterStrength = getSectionMemberCenterStrength(options.settings);
	constrainSectionMembers(nodes, graphLayout, sectionBounds, alpha, sectionMemberCenterStrength);
	applyLocalSectionMemberForces(nodes, graphLayout, options.settings, alpha);
	constrainSectionMembers(nodes, graphLayout, sectionBounds, alpha, sectionMemberCenterStrength);
	rememberSectionCenters(nodes, graphLayout, previousSectionCenters);
	rememberSectionMemberPositions(nodes, graphLayout, previousSectionMemberPositions);
}

export function createGraphSectionBoundsForce(
	graphLayout: GraphLayoutSettings,
	options: GraphSectionBoundsForceOptions = {},
): GraphSectionBoundsForce {
	let nodes: FGNode[] = [];
	const previousSectionCenters = new Map<string, SectionCenter>();
	const previousSectionMemberPositions = new Map<string, SectionMemberPosition>();

	const force = ((alpha: number): void => {
		applyGraphSectionBoundsTick(nodes, graphLayout, options, previousSectionCenters, previousSectionMemberPositions, alpha);
	}) as GraphSectionBoundsForce;

	force.initialize = (nextNodes: FGNode[]): void => {
		nodes = nextNodes;
		previousSectionCenters.clear();
		previousSectionMemberPositions.clear();
	};

	return force;
}
