import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('Surface2d direction mode', () => {
  it('disables directional particles when direction mode is none', () => {
    const props = createDefaultSurfaceProps();
    props.directionMode = 'none';
    render(<Surface2d {...props} />);
    expect(harness.props?.directionMode).toBe('none');
  });
});
