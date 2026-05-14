import { describe, expect, it } from 'vitest';

import { CODEGRAPHY_CORE_PACKAGE_NAME } from '../src';

describe('core package identity', () => {
  it('exposes the public npm package name', () => {
    expect(CODEGRAPHY_CORE_PACKAGE_NAME).toBe('@codegraphy/core');
  });
});
