import { describe, expect, it } from 'vitest';
import {
  formatCollapsedDescendantCount,
  shouldRenderNodeCollapseIndicator,
} from '../../../../../src/webview/components/graph/rendering/node/collapseIndicator';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';

function folderNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'src',
    label: 'src',
    color: '#38bdf8',
    borderColor: '#38bdf8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    nodeType: 'folder',
    size: 16,
    x: 0,
    y: 0,
    ...overrides,
  };
}

describe('graph/rendering/node/collapseIndicator', () => {
  it('renders only collapsible folder node indicators', () => {
    expect(shouldRenderNodeCollapseIndicator(folderNode({ isCollapsible: true }))).toBe(true);
    expect(shouldRenderNodeCollapseIndicator(folderNode({ isCollapsible: false }))).toBe(false);
    expect(shouldRenderNodeCollapseIndicator(folderNode({ nodeType: 'file', isCollapsible: true }))).toBe(false);
  });

  it('caps collapsed descendant badge labels', () => {
    expect(formatCollapsedDescendantCount(0)).toBe('');
    expect(formatCollapsedDescendantCount(12)).toBe('12');
    expect(formatCollapsedDescendantCount(100)).toBe('99+');
  });
});
