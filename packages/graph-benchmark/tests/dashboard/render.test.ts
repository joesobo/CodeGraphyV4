import { describe, expect, it } from 'vitest';

import { renderDashboard } from '../../src/dashboard/render';

describe('dashboard rendering', () => {
  it('puts the newest update first and renders metrics, attribution, trends, and visuals', () => {
    const html = renderDashboard({
      title: 'Interaction performance',
      generatedAt: '2026-07-13T19:00:00Z',
      updates: [
        { milestone: 'M2', summary: 'Attribution captured.', timestamp: '2026-07-13T19:00:00Z', title: 'M2' },
        { milestone: 'M1', summary: 'Baseline captured.', timestamp: '2026-07-13T18:00:00Z', title: 'M1' },
      ],
      fixtures: [{
        fixture: '500',
        potentialFpsIncreasePct: 100,
        baseline: {
          milestone: 'M1', revision: 'a', frameTimeMs: 10, frameP95Ms: 11,
          onePercentHighMs: 12, frameMaxMs: 13, simulationMs: 4,
          simulationStepsPerFrame: null, simulationStepsPerSecond: null, renderMs: 6,
          potentialFps: 100, displayedFps: 60, targetLatencyFrames: 1,
          neighborLatencyFrames: 2, frozenFrameCount: 1, teleportFrameCount: 0,
          settleEnvelopeViolationCount: 1, hudDifferenceMaxPct: 2,
        },
        current: {
          milestone: 'M3', revision: 'b', frameTimeMs: 5, frameP95Ms: 6,
          onePercentHighMs: 7, frameMaxMs: 8, simulationMs: 2,
          simulationStepsPerFrame: 2.4, simulationStepsPerSecond: 144, renderMs: 3,
          potentialFps: 200, displayedFps: 144, targetLatencyFrames: 1,
          neighborLatencyFrames: 1, frozenFrameCount: 0, teleportFrameCount: 0,
          settleEnvelopeViolationCount: 0, hudDifferenceMaxPct: 1,
        },
        trend: [
          { milestone: 'M1', potentialFps: 100, revision: 'a' },
          { milestone: 'M3', potentialFps: 200, revision: 'b' },
        ],
      }],
      attribution: [{ fixture: '500', milestone: 'M2', stages: { physics: 2, render: 3 } }],
      visuals: [{ caption: 'Neighbors follow during drag.', kind: 'gif', path: 'images/drag.gif' }],
    });

    expect(html.indexOf('Attribution captured.')).toBeLessThan(html.indexOf('Baseline captured.'));
    expect(html).toContain('100.0 → 200.0 potential FPS');
    expect(html).toContain('+100.0%');
    expect(html).toContain('Potential FPS improvement by commit');
    expect(html).toContain('aria-label="500 potential FPS trend"');
    expect(html).toContain('M1 · <code>a</code> · 100.0 FPS');
    expect(html).not.toContain('Frame-time trend by commit');
    expect(html).not.toContain('class="budget"');
    expect(html).toContain('2.40 / frame');
    expect(html).toContain('144.0 steps/s');
    expect(html).toContain('physics');
    expect(html).toContain('<svg');
    expect(html).toContain('images/drag.gif');
    expect(html).toContain('Neighbors follow during drag.');
  });
});
