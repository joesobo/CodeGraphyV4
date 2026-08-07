import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import type { GraphPhysicsSettings } from '@codegraphy-dev/graph-renderer/visuals';
import { readGraphViewPhysicsSettings } from '../../../../../src/extension/graphView/settings/physics/reader';

const defaults: GraphPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};

describe('graphView/settings/physics/reader', () => {
  it('reads each physics setting from configuration using the configured keys', () => {
    const get = vi.fn((_: string, fallback: number) => fallback + 1);
    const config = { get } as unknown as vscode.WorkspaceConfiguration;

    expect(readGraphViewPhysicsSettings(config, defaults)).toEqual({
      repelForce: 11,
      linkDistance: 81,
      linkForce: 1.15,
      damping: 1,
      centerForce: 1,
    });
    expect(get.mock.calls.map(([key]) => key)).toEqual([
      'physics.repelForce',
      'physics.linkDistance',
      'physics.linkForce',
      'physics.damping',
      'physics.centerForce',
    ]);
  });

  it('clamps a stored Link Distance through the shared settings boundary', () => {
    const config = {
      get: vi.fn((key: string, fallback: number) => key === 'physics.linkDistance' ? 500 : fallback),
    } as unknown as vscode.WorkspaceConfiguration;

    expect(readGraphViewPhysicsSettings(config, defaults).linkDistance).toBe(150);
  });
});
