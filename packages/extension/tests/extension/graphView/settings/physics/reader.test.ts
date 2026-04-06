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
    const get = vi.fn((key: string, fallback: number | undefined) => (
      key === 'chargeRange' ? 240 : (fallback as number) + 1
    ));
    const config = { get } as unknown as vscode.WorkspaceConfiguration;

    expect(readGraphViewPhysicsSettings(config, defaults)).toEqual({
      repelForce: 11,
      linkDistance: 81,
      linkForce: 1.15,
      damping: 1.7,
      centerForce: 1.1,
      chargeRange: 240,
    });
    expect(get.mock.calls.map(([key]) => key)).toEqual([
      'repelForce',
      'linkDistance',
      'linkForce',
      'damping',
      'centerForce',
      'chargeRange',
    ]);
  });

  it('leaves charge range unset when no default or persisted value exists', () => {
    const get = vi.fn((_: string, fallback: number | undefined) => fallback);
    const config = { get } as unknown as vscode.WorkspaceConfiguration;

    expect(readGraphViewPhysicsSettings(config, defaults).chargeRange).toBeUndefined();
  });
});
