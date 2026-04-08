import type * as vscode from 'vscode';
import type { IPhysicsSettings } from '../../../../shared/settings/physics';

export function readGraphViewPhysicsSettings(
  config: Pick<vscode.WorkspaceConfiguration, 'get'>,
  defaults: IPhysicsSettings
): IPhysicsSettings {
  return {
    repelForce: config.get<number>('physics.repelForce', defaults.repelForce),
    linkDistance: config.get<number>('physics.linkDistance', defaults.linkDistance),
    linkForce: config.get<number>('physics.linkForce', defaults.linkForce),
    damping: config.get<number>('physics.damping', defaults.damping),
    centerForce: config.get<number>('physics.centerForce', defaults.centerForce),
  };
}
