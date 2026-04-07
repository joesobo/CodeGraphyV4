import { describe, expect, it } from 'vitest';
import { detectMacPlatform } from '../../../src/webview/components/graph/platform';

describe('graph/platform', () => {
  it('detects mac and ios platforms', () => {
    expect(detectMacPlatform({ platform: 'MacIntel' })).toBe(true);
    expect(detectMacPlatform({ platform: 'iPhone' })).toBe(true);
  });

  it('returns false for missing or non-apple platforms', () => {
    expect(detectMacPlatform(undefined)).toBe(false);
    expect(detectMacPlatform({})).toBe(false);
    expect(detectMacPlatform({ platform: 'Linux x86_64' })).toBe(false);
  });
});
