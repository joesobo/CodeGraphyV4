import { describe, expect, it } from 'vitest';
import { createUnityExtensionPlugin } from '../src/extension';

describe('Unity Extension plugin', () => {
  it('uses the Extension descriptor identity', () => {
    expect(createUnityExtensionPlugin()).toMatchObject({
      id: 'codegraphy.unity.extension',
      name: 'Unity Graph View',
      apiVersion: '^1.0.0',
    });
  });
});
