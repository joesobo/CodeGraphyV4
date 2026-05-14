import type { FGNode } from '../../../model/build';
import { DEFAULT_NODE_SIZE } from '../../../model/build';
import {
	COLLISION_PADDING,
	SECTION_CHARGE_MULTIPLIER_CAP,
} from '../model';
import { clamp, isFiniteNumber } from '../numeric';
import { isExpandedGraphSection } from './state';

export function getSectionChargeMultiplier(node: FGNode): number {
	if (
		!isExpandedGraphSection(node)
		|| !isFiniteNumber(node.sectionHeight)
		|| !isFiniteNumber(node.sectionWidth)
	) {
		return 1;
	}

	const equivalentRadius = Math.sqrt((node.sectionWidth * node.sectionHeight) / Math.PI);
	const referenceRadius = DEFAULT_NODE_SIZE + COLLISION_PADDING;
	return clamp(equivalentRadius / referenceRadius, 1, SECTION_CHARGE_MULTIPLIER_CAP);
}
