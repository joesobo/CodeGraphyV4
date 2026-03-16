import { describe, it, expect } from 'vitest';
import {
  assignSelfLoopCurvature,
  assignParallelCurvature,
} from '../../../src/webview/components/graphModel/linkCurvatureAssignment';
import type { CurvatureLink } from '../../../src/webview/components/graphModel/linkCurvatureTypes';

describe('assignSelfLoopCurvature', () => {
  it('assigns curvature 1 to a single self-loop', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_A': [{ source: 'A', target: 'A' }],
    };
    assignSelfLoopCurvature(groups, 0.5);

    expect(groups['A_A'][0].curvature).toBe(1);
  });

  it('spreads curvature from curvatureMinMax to 1 for multiple self-loops', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_A': [
        { source: 'A', target: 'A' },
        { source: 'A', target: 'A' },
      ],
    };
    assignSelfLoopCurvature(groups, 0.5);

    expect(groups['A_A'][0].curvature).toBe(0.5);
    expect(groups['A_A'][1].curvature).toBe(1);
  });

  it('distributes curvature evenly for three self-loops', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_A': [
        { source: 'A', target: 'A' },
        { source: 'A', target: 'A' },
        { source: 'A', target: 'A' },
      ],
    };
    assignSelfLoopCurvature(groups, 0.5);

    expect(groups['A_A'][0].curvature).toBe(0.5);
    expect(groups['A_A'][1].curvature).toBeCloseTo(0.75);
    expect(groups['A_A'][2].curvature).toBe(1);
  });

  it('handles empty groups record', () => {
    const groups: Record<string, CurvatureLink[]> = {};
    assignSelfLoopCurvature(groups, 0.5);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});

describe('assignParallelCurvature', () => {
  it('skips groups with only one link', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_B': [{ source: 'A', target: 'B' }],
    };
    assignParallelCurvature(groups, 0.5);

    expect(groups['A_B'][0].curvature).toBeUndefined();
  });

  it('assigns symmetric curvature for two parallel links in same direction', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_B': [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'B' },
      ],
    };
    assignParallelCurvature(groups, 0.5);

    expect(groups['A_B'][0].curvature).toBe(-0.5);
    expect(groups['A_B'][1].curvature).toBe(0.5);
  });

  it('negates curvature when link sources differ from the last link source', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_B': [
        { source: 'B', target: 'A' },
        { source: 'A', target: 'B' },
      ],
    };
    assignParallelCurvature(groups, 0.5);

    // First link source is 'B', last link source is 'A', they differ
    // So first link curvature is negated: -(-0.5) = 0.5
    expect(groups['A_B'][0].curvature).toBe(0.5);
    expect(groups['A_B'][1].curvature).toBe(0.5);
  });

  it('distributes curvature evenly across three parallel links', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_B': [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'B' },
        { source: 'A', target: 'B' },
      ],
    };
    assignParallelCurvature(groups, 0.5);

    expect(groups['A_B'][0].curvature).toBe(-0.5);
    expect(groups['A_B'][1].curvature).toBeCloseTo(0);
    expect(groups['A_B'][2].curvature).toBe(0.5);
  });

  it('handles empty groups record', () => {
    const groups: Record<string, CurvatureLink[]> = {};
    assignParallelCurvature(groups, 0.5);
    expect(Object.keys(groups)).toHaveLength(0);
  });

  it('handles object-style source references for comparison', () => {
    const groups: Record<string, CurvatureLink[]> = {
      'A_B': [
        { source: { id: 'B' }, target: { id: 'A' } },
        { source: { id: 'A' }, target: { id: 'B' } },
      ],
    };
    assignParallelCurvature(groups, 0.5);

    // Sources differ: { id: 'B' } vs { id: 'A' }, so first curvature is negated
    expect(groups['A_B'][0].curvature).toBe(0.5);
    expect(groups['A_B'][1].curvature).toBe(0.5);
  });
});
