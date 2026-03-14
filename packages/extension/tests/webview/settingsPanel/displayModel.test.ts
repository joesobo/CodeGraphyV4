import { describe, expect, it } from 'vitest';
import {
  getSettingsToggleButtonState,
  resolveDisplayColor,
  shouldShowFolderNodeColor,
  shouldShowParticleControls,
} from '../../../src/webview/components/settingsPanel/displayModel';

describe('settingsPanelDisplayModel', () => {
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
});
