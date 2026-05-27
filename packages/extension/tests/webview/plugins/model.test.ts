import { describe, expect, it } from 'vitest';
import {
  getPluginsPanelItemClassName,
  getPluginsPanelWrapperClassName,
} from '../../../src/webview/components/plugins/model';

describe('plugins panel model', () => {
  it('dims disabled plugin rows', () => {
    expect(getPluginsPanelWrapperClassName(false)).toBe('opacity-50');
  });

  it('leaves enabled plugin rows undimmed', () => {
    expect(getPluginsPanelWrapperClassName(true)).toBe('');
  });

  it('returns an empty class string when no drag state applies', () => {
    expect(getPluginsPanelItemClassName(true)).toBe('');
  });

  it('uses only the enabled state for plugin row classes', () => {
    expect(getPluginsPanelItemClassName(false)).toBe('opacity-50');
  });
});
