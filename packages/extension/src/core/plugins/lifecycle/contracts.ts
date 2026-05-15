import type { IPlugin } from '../types/contracts';

export interface ILifecyclePluginInfo {
  plugin: IPlugin;
  options?: Record<string, unknown>;
}
