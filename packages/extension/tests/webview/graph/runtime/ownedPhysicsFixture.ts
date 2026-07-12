import { DEFAULT_PHYSICS_SETTINGS } from '../../../../src/shared/settings/physics';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import { createOwnedGraphLayout } from '../../../../src/webview/components/graph/rendering/surface/owned2d/layout';

export { DEFAULT_PHYSICS_SETTINGS };

export function ownedNode(id: string, overrides: Partial<FGNode> = {}): FGNode {
  return {
    id,
    label: id,
    size: 4,
    color: '#fff',
    borderColor: '#000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    ...overrides,
  };
}

export function ownedLayout(nodes: FGNode[] = [ownedNode('a')], links: FGLink[] = []) {
  return createOwnedGraphLayout(nodes, links, DEFAULT_PHYSICS_SETTINGS);
}
