import { describe, expect, it } from 'vitest';
import {
  createBidirectionalOptions,
  createDirectionOptions,
} from '../../../../../src/webview/components/settingsPanel/display/state/modeOptions';

describe('display modeOptions', () => {
  it('builds direction options for the current direction mode', () => {
    expect(createDirectionOptions('none')).toEqual([
      { value: 'arrows', label: 'Arrows', pressed: false, variant: 'secondary' },
      { value: 'particles', label: 'Particles', pressed: false, variant: 'secondary' },
      { value: 'none', label: 'None', pressed: true, variant: 'default' },
    ]);
  });

  it('builds bidirectional options for the current mode', () => {
    expect(createBidirectionalOptions('combined')).toEqual([
      { value: 'separate', label: 'Separate', pressed: false, variant: 'secondary' },
      { value: 'combined', label: 'Combined', pressed: true, variant: 'default' },
    ]);
  });
});
