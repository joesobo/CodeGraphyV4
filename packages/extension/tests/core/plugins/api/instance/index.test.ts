import { describe, expect, it } from 'vitest';
import { createTestAPI } from './runtime/access/testSupport';

describe('CodeGraphyAPIImpl version', () => {
  it('exposes the current core plugin API version', () => {
    const { api } = createTestAPI();
    expect(api.version).toBe('3.0.0');
  });
});
