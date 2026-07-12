import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../../../src/webview/components/graph/model/build';
import type { Surface2dProps } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/contracts';
import { Surface2d } from '../../../../../../src/webview/components/graph/rendering/surface/view/twoDimensional';
import { createDefaultSurfaceProps } from './surfaceFixture';

const harness = vi.hoisted(() => ({ props: undefined as Surface2dProps | undefined }));

vi.mock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/view', () => ({
  OwnedGraphSurface2d: (props: Surface2dProps) => {
    harness.props = props;
    return <div />;
  },
}));

function captured(): Surface2dProps {
  if (!harness.props) throw new Error('Owned graph surface was not rendered');
  return harness.props;
}

describe('Surface2d owned graph data wiring', () => {
  beforeEach(() => {
    harness.props = undefined;
  });

  it('preserves node size for owned collision radii', () => {
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData.nodes = [{ id: 'a', size: 10 }] as FGNode[];
    render(<Surface2d {...props} />);
    expect(captured().sharedProps.graphData.nodes[0]?.size).toBe(10);
  });

  it('preserves nodes without an explicit size for owned defaults', () => {
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData.nodes = [{ id: 'a' }] as FGNode[];
    render(<Surface2d {...props} />);
    expect(captured().sharedProps.graphData.nodes[0]?.size).toBeUndefined();
  });

  it('preserves zero-sized nodes for the owned minimum-radius policy', () => {
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData.nodes = [{ id: 'a', size: 0 }] as FGNode[];
    render(<Surface2d {...props} />);
    expect(captured().sharedProps.graphData.nodes[0]?.size).toBe(0);
  });

  it('passes link curvature to WebGPU geometry', () => {
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData.links = [
      { id: 'curved', curvature: 0.5 },
      { id: 'straight' },
    ] as FGLink[];
    render(<Surface2d {...props} />);
    expect(captured().sharedProps.graphData.links.map(link => link.curvature ?? 0)).toEqual([0.5, 0]);
  });

  it('passes the post-render overlay callback', () => {
    const props = createDefaultSurfaceProps();
    render(<Surface2d {...props} />);
    expect(captured().onRenderFramePost).toBe(props.onRenderFramePost);
  });

  it('passes plugin pointer-area metadata with graph nodes', () => {
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData.nodes = [{
      id: 'plugin',
      pointerArea2D: { width: 120, height: 80 },
    }] as FGNode[];
    render(<Surface2d {...props} />);
    expect(captured().sharedProps.graphData.nodes[0]?.pointerArea2D).toEqual({ width: 120, height: 80 });
  });

  it('disables directional arrows when direction mode is none', () => {
    const props = createDefaultSurfaceProps();
    props.directionMode = 'none';
    render(<Surface2d {...props} />);
    expect(captured().directionMode).toBe('none');
  });
});
