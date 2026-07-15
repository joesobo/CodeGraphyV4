import type { GraphLayoutConfig } from '../contracts';

export function assertGraphIntegrationConfig(config: GraphLayoutConfig): void {
  if (config.linkDistance <= 0) {
    throw new Error('Graph layout link distance must be positive');
  }
  if (config.velocityDecay < 0 || config.velocityDecay > 1) {
    throw new Error('Graph layout velocity decay must be between zero and one');
  }
}
