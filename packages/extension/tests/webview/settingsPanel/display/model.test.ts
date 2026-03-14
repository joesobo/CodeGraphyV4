import { describe, expect, it } from 'vitest';
import {
  getSettingsToggleButtonState,
  isHexColor,
  particleSpeedFromDisplay,
  particleSpeedToDisplay,
  resolveDisplayColor,
  shouldShowFolderNodeColor,
  shouldShowParticleControls,
} from '../../../../src/webview/components/settingsPanel/display/model';

describe('settingsPanel display model', () => {
  it('accepts 6-digit hex colors and rejects other values', () => {
    expect(isHexColor('#3B82F6')).toBe(true);
    expect(isHexColor('#abcdef')).toBe(true);
    expect(isHexColor('3B82F6')).toBe(false);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('x#ABCDEF')).toBe(false);
    expect(isHexColor('#ABCDEF0')).toBe(false);
  });

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

  it('falls back when a display color is not a valid hex value', () => {
    expect(resolveDisplayColor('not-a-color', '#A1A1AA')).toBe('#A1A1AA');
  });

  it('keeps valid display colors unchanged', () => {
    expect(resolveDisplayColor('#123ABC', '#A1A1AA')).toBe('#123ABC');
  });

  it('shows the folder node color control only in folder view', () => {
    expect(shouldShowFolderNodeColor('codegraphy.folder')).toBe(true);
    expect(shouldShowFolderNodeColor('codegraphy.connections')).toBe(false);
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
