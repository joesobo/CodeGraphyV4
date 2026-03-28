import { describe, expect, it } from 'vitest';
import {
  isExampleCallName,
  nextInsideExampleState
} from '../../../../src/scrap/example/calls/callKinds';

describe('example call kinds', () => {
  it('recognizes example calls', () => {
    expect(isExampleCallName('it')).toBe(true);
    expect(isExampleCallName('test')).toBe(true);
    expect(isExampleCallName('describe')).toBe(false);
    expect(isExampleCallName(undefined)).toBe(false);
  });

  it('tracks when traversal is inside an example callback', () => {
    expect(nextInsideExampleState(false, 'test')).toBe(true);
    expect(nextInsideExampleState(false, 'it')).toBe(true);
    expect(nextInsideExampleState(false, 'describe')).toBe(false);
    expect(nextInsideExampleState(true, undefined)).toBe(true);
  });
});
