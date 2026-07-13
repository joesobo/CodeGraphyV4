import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Surface2d owned-renderer callback wiring', () => {
  beforeEach(() => {
    harness.props = undefined;
  });

  it('passes particle speed to the owned overlay renderer', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(captured().particleSpeed).toBe(0.005);
  });

  it('keeps graph node sizes unchanged for owned physics and rendering', () => {
    const props = createDefaultSurfaceProps();
    props.sharedProps.graphData.nodes = [{ id: 'a', size: 7 }] as never[];
    render(<Surface2d {...props} />);
    expect(captured().sharedProps.graphData.nodes[0]?.size).toBe(7);
  });

  it('passes node decoration callbacks', () => {
    const props = createDefaultSurfaceProps();
    render(<Surface2d {...props} />);
    expect(captured().nodeLabelCanvasObject).toBe(props.nodeLabelCanvasObject);
  });

  it('passes WebGPU node styles independently from Canvas labels', () => {
    const props = createDefaultSurfaceProps();
    props.getNodeStyle = vi.fn();
    render(<Surface2d {...props} />);
    expect(captured().getNodeStyle).toBe(props.getNodeStyle);
    expect(captured().nodeLabelCanvasObject).toBe(props.nodeLabelCanvasObject);
  });

  it('passes link color and opacity callbacks', () => {
    const props = createDefaultSurfaceProps();
    render(<Surface2d {...props} />);
    expect(captured().getLinkColor).toBe(props.getLinkColor);
    expect(captured().getLinkOpacity).toBe(props.getLinkOpacity);
  });

  it('passes link width callback', () => {
    const props = createDefaultSurfaceProps();
    render(<Surface2d {...props} />);
    expect(captured().getLinkWidth).toBe(props.getLinkWidth);
  });
});
