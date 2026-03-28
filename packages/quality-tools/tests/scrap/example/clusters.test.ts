import { describe, expect, it } from 'vitest';
import { isRepeatedSetupExample, groupSetupExamples, strongestSetupCluster, coverageRelevantExamples } from '../../../src/scrap/example/clusters';
import type { ScrapExampleMetric } from '../../../src/scrap/types';

function createExample(overrides: Partial<ScrapExampleMetric> = {}): ScrapExampleMetric {
  return {
    assertionCount: 1,
    blockPath: ['suite'],
    branchCount: 0,
    describeDepth: 1,
    duplicateSetupGroupSize: 1,
    helperCallCount: 0,
    helperHiddenLineCount: 0,
    fixtureFingerprint: undefined,
    literalShapeFingerprint: undefined,
    lineCount: 1,
    mockCount: 0,
    name: 'example',
    score: 1,
    setupFingerprint: undefined,
    setupLineCount: 0,
    startLine: 1,
    endLine: 1,
    tableDriven: false,
    ...overrides
  };
}

describe('clustering', () => {
  describe('isRepeatedSetupExample', () => {
    it('returns true when all conditions are met', () => {
      const example = createExample({
        duplicateSetupGroupSize: 2,
        setupLineCount: 2,
        setupFingerprint: 'fp1'
      });

      expect(isRepeatedSetupExample(example)).toBe(true);
    });

    it('returns false when duplicateSetupGroupSize is 1', () => {
      const example = createExample({
        duplicateSetupGroupSize: 1,
        setupLineCount: 2,
        setupFingerprint: 'fp1'
      });

      expect(isRepeatedSetupExample(example)).toBe(false);
    });

    it('returns false when setupLineCount is less than 2', () => {
      const example = createExample({
        duplicateSetupGroupSize: 2,
        setupLineCount: 1,
        setupFingerprint: 'fp1'
      });

      expect(isRepeatedSetupExample(example)).toBe(false);
    });

    it('returns false when setupFingerprint is not a string', () => {
      const example = createExample({
        duplicateSetupGroupSize: 2,
        setupLineCount: 2,
        setupFingerprint: undefined
      });

      expect(isRepeatedSetupExample(example)).toBe(false);
    });
  });

  describe('groupSetupExamples', () => {
    it('groups examples by setupFingerprint', () => {
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 2, setupLineCount: 2 })
      ];

      const result = groupSetupExamples(examples);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(1);
    });

    it('returns empty array when no repeated setup examples', () => {
      const examples = [
        createExample({ setupLineCount: 1 }),
        createExample({ setupLineCount: 0 })
      ];

      const result = groupSetupExamples(examples);

      expect(result).toEqual([]);
    });

    it('returns array of clusters as values from map', () => {
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 })
      ];

      const result = groupSetupExamples(examples);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });
  });

  describe('strongestSetupCluster', () => {
    it('returns the largest cluster', () => {
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 2, setupLineCount: 2 })
      ];

      const result = strongestSetupCluster(examples);

      expect(result).toHaveLength(3);
    });

    it('returns empty array when no repeated setup examples', () => {
      const examples = [
        createExample({ setupLineCount: 1 })
      ];

      const result = strongestSetupCluster(examples);

      expect(result).toEqual([]);
    });

    it('returns the cluster with maximum length after sorting', () => {
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 5, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 5, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 5, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 5, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 5, setupLineCount: 2 })
      ];

      const result = strongestSetupCluster(examples);

      expect(result).toHaveLength(5);
    });
  });

  describe('coverageRelevantExamples', () => {
    it('filters examples that are table-driven', () => {
      const examples = [
        createExample({ tableDriven: true }),
        createExample({ tableDriven: false })
      ];

      const result = coverageRelevantExamples(examples);

      expect(result).toHaveLength(1);
      expect(result[0]?.tableDriven).toBe(true);
    });

    it('filters examples with literalShapeFingerprint', () => {
      const examples = [
        createExample({ literalShapeFingerprint: 'shape1' }),
        createExample({ literalShapeFingerprint: undefined })
      ];

      const result = coverageRelevantExamples(examples);

      expect(result).toHaveLength(1);
      expect(result[0]?.literalShapeFingerprint).toBe('shape1');
    });

    it('filters examples with fixtureFingerprint', () => {
      const examples = [
        createExample({ fixtureFingerprint: 'fixture1' }),
        createExample({ fixtureFingerprint: undefined })
      ];

      const result = coverageRelevantExamples(examples);

      expect(result).toHaveLength(1);
      expect(result[0]?.fixtureFingerprint).toBe('fixture1');
    });

    it('returns examples matching any of the three conditions', () => {
      const examples = [
        createExample({ tableDriven: true }),
        createExample({ literalShapeFingerprint: 'shape1' }),
        createExample({ fixtureFingerprint: 'fixture1' }),
        createExample({ tableDriven: false, literalShapeFingerprint: undefined, fixtureFingerprint: undefined })
      ];

      const result = coverageRelevantExamples(examples);

      expect(result).toHaveLength(3);
    });

    it('returns empty array when no examples match criteria', () => {
      const examples = [
        createExample({ tableDriven: false, literalShapeFingerprint: undefined, fixtureFingerprint: undefined })
      ];

      const result = coverageRelevantExamples(examples);

      expect(result).toEqual([]);
    });
  });

  describe('mutation killers for clusters.ts', () => {
    it('kills mutation: ArithmeticOperator right.length + left.length at line 28', () => {
      // Verify that sorting uses subtraction in the correct order for descending
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 3, setupLineCount: 2 })
      ];

      const result = strongestSetupCluster(examples);

      // The largest cluster should be returned (3 items from fp2)
      expect(result.length).toBe(3);
      // If mutation changed - to + or something else, sorting would be wrong
    });

    it('kills mutation: EqualityOperator > 2 changed to > 1 at line 5', () => {
      // Verify boundary: setupLineCount must be >= 2
      const exampleWith1 = createExample({
        duplicateSetupGroupSize: 2,
        setupLineCount: 1,
        setupFingerprint: 'fp1'
      });

      const exampleWith2 = createExample({
        duplicateSetupGroupSize: 2,
        setupLineCount: 2,
        setupFingerprint: 'fp1'
      });

      // setupLineCount = 1 should not be repeated setup
      expect(isRepeatedSetupExample(exampleWith1)).toBe(false);
      // setupLineCount = 2 should be repeated setup
      expect(isRepeatedSetupExample(exampleWith2)).toBe(true);
    });

    it('kills mutation: MethodExpression groupSetupExamples(examples) at line 27', () => {
      // Verify that groupSetupExamples is called and result is used
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 2, setupLineCount: 2 })
      ];

      const result = strongestSetupCluster(examples);

      // Should return the cluster with 3 items
      expect(result).toHaveLength(3);
    });

    it('kills mutation: ArrowFunction at line 28 must be executed', () => {
      // Verify the sorting comparator is actually executed
      const examples = [
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp1', duplicateSetupGroupSize: 2, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 3, setupLineCount: 2 }),
        createExample({ setupFingerprint: 'fp2', duplicateSetupGroupSize: 3, setupLineCount: 2 })
      ];

      const result = strongestSetupCluster(examples);

      // If comparator wasn't executed, first cluster might be returned instead
      expect(result).toHaveLength(3);
      expect(result).not.toHaveLength(2);
    });
  });
});
