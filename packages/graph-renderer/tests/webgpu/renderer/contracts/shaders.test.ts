import { describe, expect, it } from 'vitest';
import { webGpuNodeShapeCode } from '@graph-renderer/webgpu/renderer';
import { LINK_SHADER, NODE_SHADER } from '@graph-renderer/webgpu/shaders';

describe('WebGPU renderer visual contracts', () => {
  it('encodes every supported node shape for the GPU SDF shader', () => {
    expect([
      'circle',
      'square',
      'rectangle',
      'diamond',
      'triangle',
      'hexagon',
      'star',
    ].map(shape => webGpuNodeShapeCode(shape as Parameters<typeof webGpuNodeShapeCode>[0])))
      .toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('uses camera uniforms to emphasize hovered edge and node instances', () => {
    expect(LINK_SHADER).toContain('@builtin(instance_index) instanceIndex: u32');
    expect(LINK_SHADER).toContain('camera.highlightedLinkIndex');
    expect(NODE_SHADER).toContain('@builtin(instance_index) instanceIndex: u32');
    expect(NODE_SHADER).toContain('camera.hoveredNodeIndex');
    expect(NODE_SHADER).toContain('camera.hoveredNodeScale');
  });
});
