import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Surface2dProps } from '../../../../../../src/webview/components/graph/rendering/surface/owned2d/contracts';
import { Surface2d } from '../../../../../../src/webview/components/graph/rendering/surface/view/twoDimensional';
import { createDefaultSurfaceProps } from './surfaceFixture';

const harness = vi.hoisted(() => ({ props: undefined as Surface2dProps | undefined }));

vi.mock('../../../../../../src/webview/components/graph/rendering/surface/owned2d/view', () => ({
  OwnedGraphSurface2d: (props: Surface2dProps) => {
    harness.props = props;
    return <div data-testid="owned-webgpu-graph" />;
  },
}));

function captured(): Surface2dProps {
  if (!harness.props) throw new Error('Owned graph surface was not rendered');
  return harness.props;
}

describe('Surface2d', () => {
  beforeEach(() => {
    harness.props = undefined;
  });

  it('renders the owned WebGPU graph surface', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(screen.getByTestId('owned-webgpu-graph')).toBeInTheDocument();
  });

  it('passes the stage background to the owned surface', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(captured().backgroundColor).toBe('#1e1e1e');
  });

  it('preserves arrow direction mode for WebGPU link geometry', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(captured().directionMode).toBe('arrows');
  });

  it('passes the arrow color callback', () => {
    const props = createDefaultSurfaceProps();
    render(<Surface2d {...props} />);
    expect(captured().getArrowColor).toBe(props.getArrowColor);
  });

  it('preserves particle mode instead of drawing arrows', () => {
    const props = createDefaultSurfaceProps();
    props.directionMode = 'particles';
    render(<Surface2d {...props} />);
    expect(captured().directionMode).toBe('particles');
  });

  it('passes particle-count callbacks in particle mode', () => {
    const props = createDefaultSurfaceProps();
    props.directionMode = 'particles';
    render(<Surface2d {...props} />);
    expect(captured().getLinkParticles).toBe(props.getLinkParticles);
  });

  it('does not activate particles while arrow mode is selected', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(captured().directionMode).not.toBe('particles');
  });

  it('allows settled non-particle graphs to stop redrawing', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(captured().directionMode).toBe('arrows');
  });

  it('keeps animated particle mode available to the render loop', () => {
    const props = createDefaultSurfaceProps();
    props.directionMode = 'particles';
    render(<Surface2d {...props} />);
    expect(captured().directionMode).toBe('particles');
  });

  it('passes particle size to the owned overlay renderer', () => {
    render(<Surface2d {...createDefaultSurfaceProps()} />);
    expect(captured().particleSize).toBe(4);
  });
});
