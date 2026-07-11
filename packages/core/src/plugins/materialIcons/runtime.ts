import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { captureActivePerfMetricEmitter } from '../../diagnostics/perfMetrics';

export async function loadBundledMaterialIconsPlugin(): Promise<IPlugin> {
  const emitPerfMetric = captureActivePerfMetricEmitter();
  const activationStartedAt = performance.now();
  const { createMaterialIconsPlugin } = await import('@codegraphy-dev/plugin-material-icons');
  const plugin = createMaterialIconsPlugin();
  emitPerfMetric?.({
    metric: 'pluginActivationMs',
    unit: 'ms',
    value: performance.now() - activationStartedAt,
    dimension: plugin.id,
  });
  return plugin;
}
