import { describe, expect, it } from 'vitest';
import {
  getSettingsToggleButtonState,
  particleSpeedFromDisplay,
  particleSpeedToDisplay,
  shouldShowParticleControls,
} from '../../../../../src/webview/components/settingsPanel/display/state/model';

describe('settingsPanel display model', () => {
  it('marks the selected toggle button as pressed with the default variant', () => {
    expect(getSettingsToggleButtonState('particles', 'particles')).toEqual({
      pressed: true,
      variant: 'default',
    });
  });

  it('marks non-selected toggle buttons as not pressed with the secondary variant', () => {
    expect(getSettingsToggleButtonState('particles', 'arrows')).toEqual({
      pressed: false,
      variant: 'secondary',
    });
  });

  it('shows particle controls only for particle direction mode', () => {
    expect(shouldShowParticleControls('particles')).toBe(true);
    expect(shouldShowParticleControls('arrows')).toBe(false);
    expect(shouldShowParticleControls('none')).toBe(false);
  });

  it('maps the minimum internal particle speed to the minimum display value', () => {
    expect(particleSpeedToDisplay(0.0005)).toBe(1);
  });

  it('clamps internal particle speed values above the supported range', () => {
    expect(particleSpeedToDisplay(0.1)).toBe(10);
  });

  it('maps the minimum display particle level back to the minimum internal value', () => {
    expect(particleSpeedFromDisplay(1)).toBe(0.0005);
  });

  it('clamps display particle levels above the supported range', () => {
    expect(particleSpeedFromDisplay(99)).toBe(0.005);
  });
});
