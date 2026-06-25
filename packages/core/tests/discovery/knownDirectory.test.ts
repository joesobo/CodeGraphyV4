import { describe, expect, it } from 'vitest';
import { shouldSkipKnownDirectory } from '../../src/discovery/knownDirectory';

describe('discovery/knownDirectory', () => {
  it('skips exact generated and repository metadata directories', () => {
    expect(shouldSkipKnownDirectory('node_modules')).toBe(true);
    expect(shouldSkipKnownDirectory('.git')).toBe(true);
    expect(shouldSkipKnownDirectory('.codegraphy')).toBe(true);
  });

  it('skips descendants of generated and repository metadata directories', () => {
    expect(shouldSkipKnownDirectory('node_modules/react')).toBe(true);
    expect(shouldSkipKnownDirectory('.git/objects')).toBe(true);
    expect(shouldSkipKnownDirectory('.codegraphy/graph.lbug')).toBe(true);
  });

  it('normalizes Windows separators before checking known directories', () => {
    expect(shouldSkipKnownDirectory('node_modules\\react')).toBe(true);
    expect(shouldSkipKnownDirectory('.git\\objects')).toBe(true);
    expect(shouldSkipKnownDirectory('.codegraphy\\graph.lbug')).toBe(true);
  });

  it('does not skip similarly named or nested directories', () => {
    expect(shouldSkipKnownDirectory('packages/demo/node_modules')).toBe(false);
    expect(shouldSkipKnownDirectory('.github')).toBe(false);
    expect(shouldSkipKnownDirectory('node_modules_cache')).toBe(false);
    expect(shouldSkipKnownDirectory('.codegraphy-cache')).toBe(false);
  });
});
