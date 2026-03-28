import type * as vscode from 'vscode';
import type { IPhysicsSettings } from '../../../shared/contracts';

export function readGraphViewPhysicsSettings(
  config: Pick<vscode.WorkspaceConfiguration, 'get'>,
  defaults: IPhysicsSettings
): IPhysicsSettings {
  return {
    repelForce: config.get<number>('repelForce', defaults.repelForce),
    linkDistance: config.get<number>('linkDistance', defaults.linkDistance),
    linkForce: config.get<number>('linkForce', defaults.linkForce),
    damping: config.get<number>('damping', defaults.damping),
    centerForce: config.get<number>('centerForce', defaults.centerForce),
  };
}
