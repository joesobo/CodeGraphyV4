import { describe, expect, it } from 'vitest';
import {
  isComponentCovered,
  addComponentToAssigned,
  findOverlappingComponent,
  hasSignificantOverlap
} from '../../../src/organize/cohesion/overlap';

describe('isComponentCovered', () => {
  it('returns true when component has a member in assigned set', () => {
    const component = new Set(['a.ts', 'b.ts', 'c.ts']);
    const assigned = new Set(['b.ts', 'x.ts']);

    const result = isComponentCovered(component, assigned);

    expect(result).toBe(true);
  });

  it('returns false when component has no members in assigned set', () => {
    const component = new Set(['a.ts', 'b.ts']);
    const assigned = new Set(['x.ts', 'y.ts']);

    const result = isComponentCovered(component, assigned);

    expect(result).toBe(false);
  });

  it('returns true when all component members are in assigned', () => {
    const component = new Set(['a.ts', 'b.ts']);
    const assigned = new Set(['a.ts', 'b.ts', 'c.ts']);

    const result = isComponentCovered(component, assigned);

    expect(result).toBe(true);
  });

  it('returns false for empty component', () => {
    const component = new Set<string>();
    const assigned = new Set(['a.ts']);

    const result = isComponentCovered(component, assigned);

    expect(result).toBe(false);
  });

  it('returns false for empty assigned set', () => {
    const component = new Set(['a.ts']);
    const assigned = new Set<string>();

    const result = isComponentCovered(component, assigned);

    expect(result).toBe(false);
  });

  it('returns false when both sets are empty', () => {
    const component = new Set<string>();
    const assigned = new Set<string>();

    const result = isComponentCovered(component, assigned);

    expect(result).toBe(false);
  });
});

describe('addComponentToAssigned', () => {
  it('adds all component members to assigned set', () => {
    const component = new Set(['a.ts', 'b.ts', 'c.ts']);
    const assigned = new Set<string>();

    addComponentToAssigned(component, assigned);

    expect(assigned).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
  });

  it('adds to existing assigned set without removing members', () => {
    const component = new Set(['b.ts', 'c.ts']);
    const assigned = new Set(['a.ts']);

    addComponentToAssigned(component, assigned);

    expect(assigned).toEqual(new Set(['a.ts', 'b.ts', 'c.ts']));
  });

  it('handles adding duplicate members (idempotent)', () => {
    const component = new Set(['a.ts', 'b.ts']);
    const assigned = new Set(['a.ts']);

    addComponentToAssigned(component, assigned);

    expect(assigned).toEqual(new Set(['a.ts', 'b.ts']));
  });

  it('handles empty component (no-op)', () => {
    const component = new Set<string>();
    const assigned = new Set(['a.ts']);

    addComponentToAssigned(component, assigned);

    expect(assigned).toEqual(new Set(['a.ts']));
  });

  it('handles adding to empty assigned set', () => {
    const component = new Set(['x.ts', 'y.ts', 'z.ts']);
    const assigned = new Set<string>();

    addComponentToAssigned(component, assigned);

    expect(assigned).toEqual(new Set(['x.ts', 'y.ts', 'z.ts']));
  });
});

describe('findOverlappingComponent', () => {
  it('finds component that contains a member from the given set', () => {
    const members = new Set(['b.ts']);
    const components = [
      new Set(['a.ts', 'x.ts']),
    new Set(['b.ts', 'c.ts']),
    new Set(['d.ts', 'e.ts'])
  ];

    const result = findOverlappingComponent(members, components);

    expect(result).toEqual(new Set(['b.ts', 'c.ts']));
  });

  it('returns undefined when no overlap found', () => {
    const members = new Set(['x.ts']);
    const components = [
      new Set(['a.ts', 'b.ts']),
    new Set(['c.ts', 'd.ts'])
  ];

    const result = findOverlappingComponent(members, components);

    expect(result).toBeUndefined();
  });

  it('returns first matching component when multiple overlap', () => {
    const members = new Set(['b.ts']);
    const components = [
      new Set(['a.ts', 'b.ts']),
    new Set(['b.ts', 'c.ts'])
  ];

    const result = findOverlappingComponent(members, components);

    // Should return the first one found
    expect(result).toEqual(new Set(['a.ts', 'b.ts']));
  });

  it('handles empty members set', () => {
    const members = new Set<string>();
    const components = [new Set(['a.ts', 'b.ts'])];

    const result = findOverlappingComponent(members, components);

    expect(result).toBeUndefined();
  });

  it('handles empty components array', () => {
    const members = new Set(['a.ts']);
    const components: Set<string>[] = [];

    const result = findOverlappingComponent(members, components);

    expect(result).toBeUndefined();
  });

  it('finds overlap with multiple members', () => {
    const members = new Set(['a.ts', 'b.ts', 'x.ts']);
    const components = [
      new Set(['x.ts', 'y.ts']),
    new Set(['z.ts'])
  ];

    const result = findOverlappingComponent(members, components);

    expect(result).toEqual(new Set(['x.ts', 'y.ts']));
  });
});

describe('hasSignificantOverlap', () => {
  it('returns true for 50% overlap (exactly threshold)', () => {
    const set1 = new Set(['a', 'b', 'c', 'd']);
    const set2 = new Set(['a', 'b', 'x', 'y']);

    // Overlap: a, b = 2 out of min(4,4) = 4, threshold = ceil(4 * 50 / 100) = 2
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('returns true for greater than 50% overlap', () => {
    const set1 = new Set(['a', 'b', 'c', 'd']);
    const set2 = new Set(['a', 'b', 'c', 'x']);

    // Overlap: a, b, c = 3 out of min(4,4) = 4, threshold = 2
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('returns false for less than 50% overlap', () => {
    const set1 = new Set(['a', 'b', 'c', 'd']);
    const set2 = new Set(['a', 'x', 'y', 'z']);

    // Overlap: a = 1 out of min(4,4) = 4, threshold = 2
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(false);
  });

  it('handles sets of different sizes (uses smaller set)', () => {
    const set1 = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    const set2 = new Set(['a', 'b']);

    // Smaller set is set2 (size 2), threshold = ceil(2 * 50 / 100) = 1
    // Check how many from set2 are in both: a, b = 2 >= 1
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('returns true when smaller set is fully contained', () => {
    const set1 = new Set(['a', 'b', 'c', 'd']);
    const set2 = new Set(['a', 'b']);

    // Smaller is set2 (2), threshold = ceil(2 * 50 / 100) = 1
    // Overlap: a, b = 2 >= 1
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('returns false when smaller set has no overlap', () => {
    const set1 = new Set(['a', 'b', 'c', 'd']);
    const set2 = new Set(['x', 'y']);

    // Smaller is set2 (2), threshold = ceil(2 * 50 / 100) = 1
    // Overlap: 0 < 1
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(false);
  });

  it('handles empty sets', () => {
    const set1 = new Set<string>();
    const set2 = new Set(['a']);

    // Smaller is set1 (0), threshold = ceil(0 * 50 / 100) = 0
    // Overlap: 0 >= 0
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('handles identical sets', () => {
    const set1 = new Set(['a', 'b', 'c']);
    const set2 = new Set(['a', 'b', 'c']);

    // Overlap: a, b, c = 3 out of 3, threshold = ceil(3 * 50 / 100) = 2
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('calculates threshold correctly for odd-sized sets', () => {
    const set1 = new Set(['a', 'b', 'c', 'x', 'y']);
    const set2 = new Set(['a', 'b', 'x', 'y', 'z', 'w']);

    // Smaller is set1 (5), threshold = ceil(5 * 50 / 100) = 3
    // Overlap: a, b, x, y = 4 >= 3
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(true);
  });

  it('returns false when overlap is just below threshold', () => {
    const set1 = new Set(['a', 'b', 'c', 'd', 'e']);
    const set2 = new Set(['a', 'b', 'x', 'y', 'z']);

    // Smaller is set1 (5), threshold = ceil(5 * 50 / 100) = 3
    // Overlap: a, b = 2 < 3
    const result = hasSignificantOverlap(set1, set2);

    expect(result).toBe(false);
  });
});
