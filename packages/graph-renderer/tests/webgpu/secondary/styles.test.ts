import { afterEach, describe, expect, it } from 'vitest';
import type { GraphRendererSecondaryFrame } from '../../../src';
import { createGraphBufferState } from '../../../src/webgpu/buffer/state';
import {
  createSecondaryStyleBuffers,
  destroySecondaryStyleBuffers,
  updateSecondaryStyleBuffers,
} from '../../../src/webgpu/secondary/styles';
import {
  cleanUpWebGpuHarness,
  rendererFrame,
  uploadedFloats,
  webGpuHarness,
} from '../renderer/harness/webgpu';

afterEach(cleanUpWebGpuHarness);

function secondaryFrame(): GraphRendererSecondaryFrame {
  return {
    backgroundColor: '#000000',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: 160,
    cssWidth: 160,
    devicePixelRatio: 1,
    getLinkColor: () => '#abcdef',
    getLinkOpacity: () => 0.4,
    getLinkWidth: () => 1,
    getNodeStyle: () => ({
      borderColor: '#000000', borderWidth: 0, cornerRadius: 0,
      fillColor: '#010203', fillOpacity: 1, height: 12, opacity: 1,
      shape: 'circle', width: 12,
    }),
    styleVersion: 1,
  };
}

describe('secondary graph style buffers', () => {
  it('packs base styles in primary draw order and retains matching arrays', () => {
    const harness = webGpuHarness();
    const device = harness.device as unknown as GPUDevice;
    const frame = rendererFrame();
    const primary = createGraphBufferState(device);
    primary.nodeStyles.update(frame);
    primary.renderedLinkCount = 1;
    primary.renderedLinkIndexes = Uint32Array.of(0);
    const styles = createSecondaryStyleBuffers(device, primary);

    updateSecondaryStyleBuffers(device, styles, primary, frame, secondaryFrame());
    const nodeValues = styles.nodeStyleValues;
    const linkValues = styles.linkStyleValues;
    const cachedLinkValues = styles.linkCachedStyleValues;

    expect(Array.from(uploadedFloats(harness, 'CodeGraphy secondary node styles').slice(2, 5)))
      .toEqual([
        expect.closeTo(1 / 255, 5),
        expect.closeTo(2 / 255, 5),
        expect.closeTo(3 / 255, 5),
      ]);
    expect(styles.pass.renderedLinkCount).toBe(1);
    expect(styles.linkStyleStream.buffer.label).toBe('CodeGraphy secondary link styles');
    expect(styles.linkStyleValues[1]).toBeCloseTo(0.2);

    updateSecondaryStyleBuffers(device, styles, primary, frame, secondaryFrame());

    expect(styles.nodeStyleValues).toBe(nodeValues);
    expect(styles.linkStyleValues).toBe(linkValues);
    expect(styles.linkCachedStyleValues).toBe(cachedLinkValues);
  });

  it('resizes instance arrays and destroys only its owned streams', () => {
    const harness = webGpuHarness();
    const device = harness.device as unknown as GPUDevice;
    const frame = rendererFrame();
    const primary = createGraphBufferState(device);
    primary.nodeStyles.update(frame);
    const styles = createSecondaryStyleBuffers(device, primary);
    const primaryPositionBuffer = primary.nodePositionStream.buffer;

    updateSecondaryStyleBuffers(device, styles, primary, frame, secondaryFrame());
    const emptyLinkValues = styles.linkStyleValues;
    primary.renderedLinkCount = 1;
    primary.renderedLinkIndexes = Uint32Array.of(0);
    updateSecondaryStyleBuffers(device, styles, primary, frame, secondaryFrame());

    expect(styles.linkStyleValues).not.toBe(emptyLinkValues);
    expect(styles.pass.nodePositionStream).toBe(primary.nodePositionStream);
    expect(styles.pass.linkGeometryStream).toBe(primary.linkGeometryStream);

    destroySecondaryStyleBuffers(styles);

    expect(styles.linkStyleStream.buffer.destroy).toHaveBeenCalledOnce();
    expect(styles.nodeStyleStream.buffer.destroy).toHaveBeenCalledOnce();
    expect(primaryPositionBuffer.destroy).not.toHaveBeenCalled();
  });
});
