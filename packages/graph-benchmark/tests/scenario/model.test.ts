import { describe, expect, it } from 'vitest';

import { parseFeelScenario } from '../../src/scenario/model';

describe('parseFeelScenario', () => {
  it('accepts the versioned deterministic input format', () => {
    const scenario = parseFeelScenario({
      schemaVersion: 1,
      id: 'drag-leaf-release',
      fixture: { name: '1k', seed: 307 },
      durationTicks: 480,
      actions: [
        { atTick: 120, type: 'pointer-down', nodeId: 'node-42' },
        { atTick: 180, type: 'pointer-move', x: 320, y: 180 },
        { atTick: 240, type: 'pointer-up' },
      ],
    });

    expect(scenario.id).toBe('drag-leaf-release');
    expect(scenario.actions).toHaveLength(3);
  });

  it('rejects actions that are not ordered by tick', () => {
    expect(() => parseFeelScenario({
      schemaVersion: 1,
      id: 'invalid-order',
      fixture: { name: '1k', seed: 307 },
      durationTicks: 100,
      actions: [
        { atTick: 20, type: 'pointer-up' },
        { atTick: 10, type: 'load' },
      ],
    })).toThrow('scenario.actions must be ordered by atTick');
  });
});
