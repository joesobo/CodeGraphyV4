import { describe, expect, it } from 'vitest';
import {
  normalizeOwnedArrowPosition,
  parseWebGpuColor,
  webGpuNodeShapeCode,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/webgpu/renderer';

function expectColor(actual: readonly number[], expected: readonly number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((channel, index) => {
    expect(channel).toBeCloseTo(expected[index], 5);
  });
}

describe('owned WebGPU renderer color parsing', () => {
  it('parses short and full hexadecimal colors', () => {
    expectColor(parseWebGpuColor('#0af'), [0, 170 / 255, 1, 1]);
    expectColor(parseWebGpuColor('#33669980'), [51 / 255, 102 / 255, 153 / 255, 128 / 255]);
  });

  it('parses rgb and rgba colors', () => {
    expectColor(parseWebGpuColor('rgb(255, 128, 0)'), [1, 128 / 255, 0, 1]);
    expectColor(parseWebGpuColor('rgba(10, 20, 30, 0.25)'), [10 / 255, 20 / 255, 30 / 255, 0.25]);
  });

  it('parses modern color syntax produced by computed graph themes', () => {
    expectColor(
      parseWebGpuColor('color(srgb 0.0705882 0.203922 0.337255 / 0.95)'),
      [0.0705882, 0.203922, 0.337255, 0.95],
    );
  });

  it('keeps the transparent stage color transparent', () => {
    expect(parseWebGpuColor('transparent')).toEqual([0, 0, 0, 0]);
  });

  it('uses opaque black for unsupported CSS colors', () => {
    expect(parseWebGpuColor('not-a-color')).toEqual([0, 0, 0, 1]);
  });

  it('clamps directional-arrow positions to the public link contract', () => {
    expect(normalizeOwnedArrowPosition(-1)).toBe(0);
    expect(normalizeOwnedArrowPosition(0.65)).toBe(0.65);
    expect(normalizeOwnedArrowPosition(2)).toBe(1);
    expect(normalizeOwnedArrowPosition(Number.NaN)).toBe(1);
  });

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
});
