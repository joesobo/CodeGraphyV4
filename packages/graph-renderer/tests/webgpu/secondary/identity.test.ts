import { describe, expect, it } from 'vitest';
import type { GraphRendererSecondaryFrame } from '../../../src';
import { createGraphBufferState } from '../../../src/webgpu/buffer/state';
import {
  createSecondaryStyleIdentity,
  secondaryStyleIdentityChanged,
} from '../../../src/webgpu/secondary/identity';
import { rendererFrame, webGpuHarness } from '../renderer/harness/webgpu';

function secondaryFrame(): GraphRendererSecondaryFrame {
  const frame = rendererFrame();
  return {
    backgroundColor: '#000000',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: 160,
    cssWidth: 160,
    devicePixelRatio: 1,
    getLinkColor: frame.getLinkColor,
    getLinkOpacity: frame.getLinkOpacity,
    getLinkWidth: frame.getLinkWidth,
    getNodeStyle: frame.getNodeStyle,
    styleVersion: 1,
  };
}

describe('secondary style identity', () => {
  it('retains every input that controls secondary packing', () => {
    const device = webGpuHarness().device as unknown as GPUDevice;
    const primary = createGraphBufferState(device);
    primary.renderedLinkOrderRevision = 4;
    const frame = rendererFrame();
    const secondary = secondaryFrame();

    const identity = createSecondaryStyleIdentity(primary, frame, secondary);

    expect(identity).toEqual({
      getLinkColor: secondary.getLinkColor,
      getLinkOpacity: secondary.getLinkOpacity,
      getLinkWidth: secondary.getLinkWidth,
      getNodeStyle: secondary.getNodeStyle,
      links: frame.links,
      nodes: frame.nodes,
      renderedLinkOrderRevision: 4,
      version: 1,
    });
    expect(secondaryStyleIdentityChanged(identity, primary, frame, secondary)).toBe(false);
  });

  it('treats an absent identity as changed', () => {
    const device = webGpuHarness().device as unknown as GPUDevice;
    expect(secondaryStyleIdentityChanged(
      undefined,
      createGraphBufferState(device),
      rendererFrame(),
      secondaryFrame(),
    )).toBe(true);
  });

  it.each([
    'getLinkColor',
    'getLinkOpacity',
    'getLinkWidth',
    'getNodeStyle',
  ] as const)('detects changed %s callbacks', field => {
    const device = webGpuHarness().device as unknown as GPUDevice;
    const primary = createGraphBufferState(device);
    const frame = rendererFrame();
    const secondary = secondaryFrame();
    const identity = createSecondaryStyleIdentity(primary, frame, secondary);
    const changed = { ...secondary, [field]: () => field } as GraphRendererSecondaryFrame;

    expect(secondaryStyleIdentityChanged(identity, primary, frame, changed)).toBe(true);
  });

  it.each(['links', 'nodes'] as const)('detects changed graph %s identity', field => {
    const device = webGpuHarness().device as unknown as GPUDevice;
    const primary = createGraphBufferState(device);
    const frame = rendererFrame();
    const secondary = secondaryFrame();
    const identity = createSecondaryStyleIdentity(primary, frame, secondary);
    const changedFrame = { ...frame, [field]: [...frame[field]] };

    expect(secondaryStyleIdentityChanged(identity, primary, changedFrame, secondary)).toBe(true);
  });

  it('detects link-order revisions that occur without a secondary frame', () => {
    const device = webGpuHarness().device as unknown as GPUDevice;
    const primary = createGraphBufferState(device);
    const frame = rendererFrame();
    const secondary = secondaryFrame();
    const identity = createSecondaryStyleIdentity(primary, frame, secondary);

    primary.renderedLinkOrderRevision += 1;

    expect(secondaryStyleIdentityChanged(identity, primary, frame, secondary)).toBe(true);
  });

  it('detects changed base-style versions', () => {
    const device = webGpuHarness().device as unknown as GPUDevice;
    const primary = createGraphBufferState(device);
    const frame = rendererFrame();
    const secondary = secondaryFrame();
    const identity = createSecondaryStyleIdentity(primary, frame, secondary);

    expect(secondaryStyleIdentityChanged(
      identity,
      primary,
      frame,
      { ...secondary, styleVersion: 2 },
    )).toBe(true);
  });
});
