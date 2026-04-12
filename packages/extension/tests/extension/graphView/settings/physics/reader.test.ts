import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';
import type { IPhysicsSettings } from '../../../../../src/shared/settings/physics';
import { readGraphViewPhysicsSettings } from '../../../../../src/extension/graphView/settings/physics/reader';

const defaults: IPhysicsSettings = {
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
      damping: 1.7,
      centerForce: 1.1,
    });
    expect(get.mock.calls.map(([key]) => key)).toEqual([
      'physics.repelForce',
      'physics.linkDistance',
      'physics.linkForce',
      'physics.damping',
      'physics.centerForce',
    ]);
  });
});
