import type { FGNode } from '../../../model/build';
import type { SectionEdge } from '../model';
import { isFiniteNumber } from '../numeric';

export function hasBridgeEndpointPositions(memberNode: FGNode, externalNode: FGNode): boolean {
	return isFiniteNumber(memberNode.x)
		&& isFiniteNumber(memberNode.y)
		&& isFiniteNumber(externalNode.x)
		&& isFiniteNumber(externalNode.y);
}

export function getBridgePressEdge(memberNode: FGNode, externalNode: FGNode): SectionEdge {
	const deltaX = externalNode.x! - memberNode.x!;
	const deltaY = externalNode.y! - memberNode.y!;
	if (Math.abs(deltaX) >= Math.abs(deltaY)) {
		return deltaX >= 0 ? 'right' : 'left';
	}

	return deltaY >= 0 ? 'bottom' : 'top';
}
