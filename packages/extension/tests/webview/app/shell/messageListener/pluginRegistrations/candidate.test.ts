import { describe, expect, it } from 'vitest';
import { toPluginRegistrationCandidate } from '../../../../../../src/webview/app/shell/messageListener/pluginRegistrations/candidate';

describe('app/shell/messageListener/pluginRegistrations/candidate', () => {
  it('rejects missing, primitive, and id-less plugin entries', () => {
    expect(toPluginRegistrationCandidate(null)).toBeNull();
    expect(toPluginRegistrationCandidate(123)).toBeNull();
    expect(toPluginRegistrationCandidate({ enabled: false })).toBeNull();
  });

  it('normalizes plugin id, enabled state, and string package name', () => {
    expect(toPluginRegistrationCandidate({
      enabled: true,
      id: 'runtime.plugin',
      packageName: '@acme/plugin',
    })).toEqual({
      enabled: true,
      id: 'runtime.plugin',
      packageName: '@acme/plugin',
    });
  });

  it('drops non-string package names', () => {
    expect(toPluginRegistrationCandidate({
      enabled: false,
      id: 'runtime.plugin',
      packageName: 123,
    })).toEqual({
      enabled: false,
      id: 'runtime.plugin',
      packageName: undefined,
    });
  });
});
