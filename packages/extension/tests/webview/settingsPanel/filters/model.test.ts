import { describe, expect, it } from 'vitest';
import {
  canAddFilterPattern,
  clampMaxFiles,
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
  shouldShowPluginFilterPatterns,
} from '../../../../src/webview/components/settingsPanel/filters/model';

describe('settingsPanel filter model', () => {
  it('only allows non-empty filter patterns after trimming', () => {
    expect(canAddFilterPattern('**/*.log')).toBe(true);
    expect(canAddFilterPattern('   ')).toBe(false);
  });

  it('clamps max files to at least one', () => {
    expect(clampMaxFiles(0)).toBe(1);
    expect(clampMaxFiles(250)).toBe(250);
  });

  it('parses numeric max-file inputs and rejects invalid values', () => {
    expect(parseMaxFilesInput('250')).toBe(250);
    expect(parseMaxFilesInput('abc')).toBeNull();
  });

  it('decreases max files in steps of one hundred without going below one', () => {
    expect(decreaseMaxFiles(500)).toBe(400);
    expect(decreaseMaxFiles(50)).toBe(1);
  });

  it('increases max files in steps of one hundred', () => {
    expect(increaseMaxFiles(500)).toBe(600);
  });

  it('shows plugin filter patterns only when defaults are present', () => {
    expect(shouldShowPluginFilterPatterns(['**/*.uid'])).toBe(true);
    expect(shouldShowPluginFilterPatterns([])).toBe(false);
  });
});
