import type * as vscode from 'vscode';
import {
  normalizeGraphPhysicsSettings,
  type GraphPhysicsSettings,
} from '@codegraphy-dev/graph-visuals';

export function readGraphViewPhysicsSettings(
  config: Pick<vscode.WorkspaceConfiguration, 'get'>,
  defaults: GraphPhysicsSettings
): GraphPhysicsSettings {
  return normalizeGraphPhysicsSettings({
    repelForce: config.get<number>('physics.repelForce', defaults.repelForce),
    linkDistance: config.get<number>('physics.linkDistance', defaults.linkDistance),
    linkForce: config.get<number>('physics.linkForce', defaults.linkForce),
    damping: config.get<number>('physics.damping', defaults.damping),
    centerForce: config.get<number>('physics.centerForce', defaults.centerForce),
  });
}
