import type { FGNode } from '../../../model/build';

export function shouldRenderNodeCollapseIndicator(node: FGNode): boolean {
	return node.nodeType === 'folder' && node.isCollapsible === true;
}
