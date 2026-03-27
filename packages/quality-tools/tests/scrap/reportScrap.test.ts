import { describe, expect, it, vi } from 'vitest';
import { reportScrap } from '../../src/scrap/reportScrap';

describe('reportScrap', () => {
  it('prints a no-files message when nothing is analyzed', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reportScrap([], '/repo');
    expect(log).toHaveBeenCalledWith('\nNo test files found for SCRAP analysis.\n');
    log.mockRestore();
  });

  it('prints the file summary and worst examples', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reportScrap([
      {
        aiActionability: 'AUTO_REFACTOR',
        averageScore: 4.2,
        branchingExampleCount: 1,
        blockSummaries: [
          {
            averageScore: 8,
            branchingExampleCount: 1,
            duplicateSetupExampleCount: 1,
            exampleCount: 2,
            helperHiddenExampleCount: 1,
            hotExampleCount: 1,
            lowAssertionExampleCount: 1,
            maxScore: 9,
            name: 'inner',
            path: ['suite', 'inner'],
            recommendedExtractionCount: 0,
            remediationMode: 'LOCAL',
            zeroAssertionExampleCount: 1
          }
        ],
        coverageMatrixCandidateCount: 0,
        duplicateSetupExampleCount: 1,
        exampleCount: 2,
        extractionPressureScore: 0,
        filePath: '/repo/packages/example/tests/file.test.ts',
        helperHiddenExampleCount: 1,
        lowAssertionExampleCount: 1,
        maxScore: 9,
        remediationMode: 'LOCAL',
        tempResourceExampleCount: 0,
        validationIssues: [],
        worstExamples: [
          {
            assertionCount: 0,
            blockPath: ['suite', 'inner'],
            branchCount: 1,
            describeDepth: 1,
            duplicateSetupGroupSize: 2,
            endLine: 10,
            helperCallCount: 1,
            helperHiddenLineCount: 6,
            lineCount: 5,
            mockCount: 1,
            name: 'bad test',
            score: 9,
            setupDepth: 0,
            setupLineCount: 3,
            startLine: 6
          }
        ],
        zeroAssertionExampleCount: 1
      }
    ], '/repo');

    const lines = log.mock.calls.map(([line]) => line);
    expect(lines).toContain('\npackages/example/tests/file.test.ts');
    expect(lines).toContain('  actionability: AUTO_REFACTOR');
    expect(lines).toContain('  coverage-matrix: 0');
    expect(lines).toContain('  extraction-pressure: 0');
    expect(lines).toContain('  vitest-signals: snapshots=0 waits=0 fake-timers=0 env/global=0 concurrent=0 type-only=0');
    expect(lines).toContain('  temp-resources: 0');
    expect(lines).toContain('  validation-issues: 0');
    expect(lines).toContain('  hot blocks:');
    expect(lines).toContain('    - suite > inner mode=LOCAL examples=2 avg/max=8 / 9 hot=1 dupes=1 helpers=1 extract=0');
    expect(lines).toContain('  worst examples:');
    expect(lines).toContain('    - bad test (L6-L10) score=9 assertions=0 branches=1 mocks=1 setup=3 dupes=2 helpers=1 hidden=6');
    log.mockRestore();
  });

  it('omits the worst example section when none are present', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reportScrap([
      {
        aiActionability: 'LEAVE_ALONE',
        averageScore: 1,
        branchingExampleCount: 0,
        blockSummaries: [],
        coverageMatrixCandidateCount: 0,
        duplicateSetupExampleCount: 0,
        exampleCount: 1,
        extractionPressureScore: 0,
        filePath: '/repo/packages/example/tests/good.test.ts',
        helperHiddenExampleCount: 0,
        lowAssertionExampleCount: 0,
        maxScore: 1,
        remediationMode: 'STABLE',
        tempResourceExampleCount: 0,
        validationIssues: [],
        worstExamples: [],
        zeroAssertionExampleCount: 0
      }
    ], '/repo');

    const lines = log.mock.calls.map(([line]) => line);
    expect(lines).toContain('\npackages/example/tests/good.test.ts');
    expect(lines).toContain('  actionability: LEAVE_ALONE');
    expect(lines).toContain('  coverage-matrix: 0');
    expect(lines).toContain('  extraction-pressure: 0');
    expect(lines).toContain('  vitest-signals: snapshots=0 waits=0 fake-timers=0 env/global=0 concurrent=0 type-only=0');
    expect(lines).not.toContain('  worst examples:');
    log.mockRestore();
  });

  it('limits hot blocks to five and skips stable block summaries', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportScrap([
      {
        aiActionability: 'AUTO_REFACTOR',
        averageScore: 6,
        branchingExampleCount: 0,
        blockSummaries: [
          { averageScore: 9, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 9, name: 'a', path: ['a'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
          { averageScore: 8, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 8, name: 'b', path: ['b'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
          { averageScore: 7, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 7, name: 'c', path: ['c'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
          { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 0, lowAssertionExampleCount: 0, maxScore: 6, name: 'stable', path: ['stable'], recommendedExtractionCount: 0, remediationMode: 'STABLE', zeroAssertionExampleCount: 0 },
          { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 6, name: 'd', path: ['d'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
          { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 6, name: 'e', path: ['e'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 },
          { averageScore: 6, branchingExampleCount: 0, duplicateSetupExampleCount: 0, exampleCount: 1, helperHiddenExampleCount: 0, hotExampleCount: 1, lowAssertionExampleCount: 0, maxScore: 6, name: 'f', path: ['f'], recommendedExtractionCount: 0, remediationMode: 'LOCAL', zeroAssertionExampleCount: 0 }
        ],
        coverageMatrixCandidateCount: 0,
        duplicateSetupExampleCount: 0,
        exampleCount: 1,
        extractionPressureScore: 0,
        filePath: '/repo/packages/example/tests/blocks.test.ts',
        helperHiddenExampleCount: 0,
        lowAssertionExampleCount: 0,
        maxScore: 6,
        remediationMode: 'LOCAL',
        tempResourceExampleCount: 0,
        validationIssues: [],
        worstExamples: [],
        zeroAssertionExampleCount: 0
      }
    ], '/repo');

    const lines = log.mock.calls.map(([line]) => line);
    expect(lines).toContain('  hot blocks:');
    expect(lines).toContain('    - a mode=LOCAL examples=1 avg/max=9 / 9 hot=1 dupes=0 helpers=0 extract=0');
    expect(lines).toContain('    - e mode=LOCAL examples=1 avg/max=6 / 6 hot=1 dupes=0 helpers=0 extract=0');
    expect(lines).not.toContain('    - stable mode=STABLE examples=1 avg/max=6 / 6 hot=0 dupes=0 helpers=0 extract=0');
    expect(lines).not.toContain('    - f mode=LOCAL examples=1 avg/max=6 / 6 hot=1 dupes=0 helpers=0 extract=0');
    log.mockRestore();
  });

  it('prints validation, recommendations, comparison, and verbose detail when present', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportScrap([
      {
        aiActionability: 'REVIEW_FIRST',
        averageScore: 7,
        branchingExampleCount: 1,
        blockSummaries: [],
        comparison: {
          averageScoreDelta: -1,
          coverageMatrixDelta: 1,
          extractionPressureDelta: 2,
          harmfulDuplicationDelta: 1,
          helperHiddenDelta: 0,
          maxScoreDelta: -2,
          verdict: 'mixed'
        },
        coverageMatrixCandidateCount: 1,
        duplicateSetupExampleCount: 1,
        exampleCount: 1,
        extractionPressureScore: 2,
        filePath: '/repo/packages/example/tests/verbose.test.ts',
        helperHiddenExampleCount: 1,
        lowAssertionExampleCount: 1,
        maxScore: 9,
        recommendations: [
          {
            confidence: 'HIGH',
            kind: 'TABLE_DRIVE',
            message: '1 example(s) look like a coverage matrix that should be table-driven.'
          }
        ],
        remediationMode: 'LOCAL',
        tempResourceExampleCount: 1,
        validationIssues: [
          {
            kind: 'nested-test',
            line: 9,
            message: 'Nested test call inside another test body.'
          }
        ],
        worstExamples: [
          {
            assertionCount: 1,
            blockPath: ['suite'],
            branchCount: 1,
            describeDepth: 1,
            duplicateSetupGroupSize: 1,
            endLine: 12,
            helperCallCount: 0,
            helperHiddenLineCount: 0,
            lineCount: 5,
            mockCount: 0,
            name: 'verbose test',
            score: 9,
            setupDepth: 2,
            setupLineCount: 3,
            startLine: 8,
            tableDriven: true,
            tempResourceCount: 1
          }
        ],
        zeroAssertionExampleCount: 0
      }
    ], '/repo', { verbose: true });

    const lines = log.mock.calls.map(([line]) => line);
    expect(lines).toContain('  compare: mixed avgΔ=-1 maxΔ=-2 extractΔ=2');
    expect(lines).toContain('  validation:');
    expect(lines).toContain('    - [nested-test] L9 Nested test call inside another test body.');
    expect(lines).toContain('  recommendations:');
    expect(lines).toContain('    - TABLE_DRIVE confidence=HIGH 1 example(s) look like a coverage matrix that should be table-driven.');
    expect(lines).toContain('  verbose examples:');
    expect(lines.some((line) => line.includes('verbose test tableDriven=true setupDepth=2 tempResources=1'))).toBe(true);
    log.mockRestore();
  });
});
