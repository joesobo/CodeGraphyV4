import { describe, expect, it } from 'vitest';
import {
  assertionPressure,
  branchPressure,
  duplicateSetupPressure,
  helperHiddenPressure,
  linePressure,
  mockPressure,
  nestingPressure
} from '../../src/scrap/examplePressure';

describe('linePressure', () => {
  it('stays at zero below the line threshold and caps at six', () => {
    expect(linePressure(8)).toBe(0);
    expect(linePressure(14)).toBe(1);
    expect(linePressure(200)).toBe(6);
  });
});

describe('assertionPressure', () => {
  it('penalizes zero and single assertion examples differently', () => {
    expect(assertionPressure(0)).toBe(8);
    expect(assertionPressure(1)).toBe(3);
    expect(assertionPressure(2)).toBe(0);
  });
});

describe('branchPressure', () => {
  it('scales branches and caps at six', () => {
    expect(branchPressure(0)).toBe(0);
    expect(branchPressure(2)).toBe(4);
    expect(branchPressure(8)).toBe(6);
  });
});

describe('mockPressure', () => {
  it('scales mocks and caps at four', () => {
    expect(mockPressure(0)).toBe(0);
    expect(mockPressure(3)).toBe(3);
    expect(mockPressure(10)).toBe(4);
  });
});

describe('helperHiddenPressure', () => {
  it('ignores tiny helpers and caps hidden helper pressure', () => {
    expect(helperHiddenPressure(4)).toBe(0);
    expect(helperHiddenPressure(5)).toBe(1);
    expect(helperHiddenPressure(40)).toBe(6);
  });
});

describe('duplicateSetupPressure', () => {
  it('ignores tiny or unique setup and rewards repeated non-trivial setup', () => {
    expect(duplicateSetupPressure(0, 0)).toBe(0);
    expect(duplicateSetupPressure(2, 1)).toBe(0);
    expect(duplicateSetupPressure(2, 2)).toBe(1);
    expect(duplicateSetupPressure(4, 8)).toBe(4);
  });
});

describe('nestingPressure', () => {
  it('ignores shallow nesting and counts depth beyond two', () => {
    expect(nestingPressure(1)).toBe(0);
    expect(nestingPressure(2)).toBe(0);
    expect(nestingPressure(5)).toBe(3);
  });
});
