import { describe, expect, it } from 'vitest';
import { scoreExample } from '../../src/scrap/scoreExample';

describe('scoreExample', () => {
  it('adds all pressure sources for a weak example', () => {
    expect(scoreExample({
      assertionCount: 0,
      blockPath: ['suite'],
      branchCount: 2,
      describeDepth: 4,
      duplicateSetupGroupSize: 0,
      endLine: 20,
      helperCallCount: 0,
      helperHiddenLineCount: 0,
      lineCount: 16,
      mockCount: 2,
      name: 'example',
      setupLineCount: 0,
      startLine: 5
    })).toBe(18);
  });

  it('keeps small well-asserted examples low', () => {
    expect(scoreExample({
      assertionCount: 2,
      blockPath: ['suite'],
      branchCount: 0,
      describeDepth: 1,
      duplicateSetupGroupSize: 0,
      endLine: 3,
      helperCallCount: 0,
      helperHiddenLineCount: 0,
      lineCount: 3,
      mockCount: 0,
      name: 'example',
      setupLineCount: 0,
      startLine: 1
    })).toBe(0);
  });

  it('adds helper-hidden pressure when helpers hide meaningful setup', () => {
    expect(scoreExample({
      assertionCount: 2,
      blockPath: ['suite'],
      branchCount: 0,
      describeDepth: 1,
      duplicateSetupGroupSize: 0,
      endLine: 12,
      helperCallCount: 1,
      helperHiddenLineCount: 12,
      lineCount: 4,
      mockCount: 0,
      name: 'example',
      setupLineCount: 0,
      startLine: 9
    })).toBe(2);
  });

  it('adds duplicate setup pressure when setup repeats across sibling examples', () => {
    expect(scoreExample({
      assertionCount: 2,
      blockPath: ['suite'],
      branchCount: 0,
      describeDepth: 1,
      duplicateSetupGroupSize: 3,
      endLine: 12,
      helperCallCount: 0,
      helperHiddenLineCount: 0,
      lineCount: 4,
      mockCount: 0,
      name: 'example',
      setupLineCount: 5,
      startLine: 9
    })).toBe(3);
  });

  it('adds setup-depth and temp-resource pressure with the expected caps', () => {
    expect(scoreExample({
      assertionCount: 2,
      blockPath: ['suite'],
      branchCount: 0,
      describeDepth: 1,
      duplicateSetupGroupSize: 0,
      endLine: 12,
      helperCallCount: 0,
      helperHiddenLineCount: 0,
      lineCount: 4,
      mockCount: 0,
      name: 'example',
      setupDepth: 4,
      setupLineCount: 0,
      startLine: 9,
      tempResourceCount: 9
    })).toBe(6);
  });

  it('adds Vitest operational pressure for snapshots, waits, timers, env mutations, and concurrency', () => {
    expect(scoreExample({
      assertionCount: 2,
      asyncWaitCount: 2,
      blockPath: ['suite'],
      branchCount: 0,
      concurrencyCount: 2,
      describeDepth: 1,
      duplicateSetupGroupSize: 0,
      endLine: 12,
      envMutationCount: 1,
      fakeTimerCount: 1,
      helperCallCount: 0,
      helperHiddenLineCount: 0,
      lineCount: 4,
      mockCount: 0,
      name: 'example',
      setupLineCount: 0,
      snapshotCount: 3,
      startLine: 9
    })).toBe(8);
  });
});
