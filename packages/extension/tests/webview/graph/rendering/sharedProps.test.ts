import { describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  buildSharedGraphProps,
  type BuildSharedGraphPropsOptions,
} from '../../../../src/webview/components/graph/rendering/surface/sharedProps';

function options(width = 640): BuildSharedGraphPropsOptions {
  return {
    graphData: { links: [] as FGLink[], nodes: [] as FGNode[] },
    onBackgroundClick: vi.fn(),
    onBackgroundRightClick: vi.fn(),
    onEngineStop: vi.fn(),
    onLinkClick: vi.fn(),
    onLinkRightClick: vi.fn(),
    onNodeClick: vi.fn(),
    onNodeDrag: vi.fn(),
    onNodeDragEnd: vi.fn(),
    onNodeHover: vi.fn(),
    onNodeRightClick: vi.fn(),
    width,
  };
}

describe('graph/rendering/surface/sharedProps', () => {
  it('normalizes an unavailable container width', () => {
    expect(buildSharedGraphProps(options(0)).width).toBeUndefined();
    expect(buildSharedGraphProps(options(-24)).width).toBe(-24);
  });

  it('preserves graph data and interaction callbacks', () => {
    const input = options();
    const props = buildSharedGraphProps(input);

    expect(props).toEqual({ ...input, width: 640 });
    expect(props.graphData).toBe(input.graphData);
    expect(props.onNodeDrag).toBe(input.onNodeDrag);
  });
});
