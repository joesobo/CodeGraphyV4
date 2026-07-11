import { describe, expect, it } from 'vitest';
import { createTestAPI } from './runtime/access/testSupport';

describe('CodeGraphyAPIImpl version', () => {
  it('exposes version 2.2.0', () => {
    const { api } = createTestAPI();
    expect(api.version).toBe('2.2.0');
  });
});
