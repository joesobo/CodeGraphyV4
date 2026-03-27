import { describe, expect, it } from 'vitest';
import { isHookOrStructureCallName } from '../../src/scrap/hookStructureCallKinds';

describe('hook and structure call kinds', () => {
  it('recognizes hook and structure calls', () => {
    expect(isHookOrStructureCallName('afterAll')).toBe(true);
    expect(isHookOrStructureCallName('beforeEach')).toBe(true);
    expect(isHookOrStructureCallName('afterEach')).toBe(true);
    expect(isHookOrStructureCallName('beforeAll')).toBe(true);
    expect(isHookOrStructureCallName('context')).toBe(true);
    expect(isHookOrStructureCallName('describe')).toBe(true);
    expect(isHookOrStructureCallName('test')).toBe(false);
    expect(isHookOrStructureCallName(undefined)).toBe(false);
  });
});
