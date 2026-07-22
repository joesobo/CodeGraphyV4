import { describe, expect, it } from 'vitest';
import {
  readInstalledPluginDefaultOptions,
  readInstalledPluginUpdateImpact,
} from '../../../../../src/extension/graphView/webview/settingsMessages/defaultOptions';

describe('graph view settings plugin defaults', () => {
  it('does not read host-specific settings from the host-neutral install cache', () => {
    expect(readInstalledPluginDefaultOptions('codegraphy.godot')).toBeUndefined();
    expect(readInstalledPluginUpdateImpact('codegraphy.particles')).toBeUndefined();
  });
});
