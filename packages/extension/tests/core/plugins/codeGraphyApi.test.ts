import { describe, expect, it } from 'vitest';
import { createTestAPI } from './codeGraphyApi.test-utils';

describe('CodeGraphyAPIImpl version', () => {
  it('exposes version 2.0.0', () => {
    const { api } = createTestAPI();
    expect(api.version).toBe('2.0.0');
  });
});
