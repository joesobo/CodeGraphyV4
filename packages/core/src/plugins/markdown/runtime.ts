import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { captureActivePerfMetricEmitter } from '../../diagnostics/perfMetrics';

export async function loadBundledMarkdownPlugin(): Promise<IPlugin> {
  const emitPerfMetric = captureActivePerfMetricEmitter();
  const activationStartedAt = performance.now();
  const { createMarkdownPlugin } = await import('@codegraphy-dev/plugin-markdown');
  const plugin = createMarkdownPlugin();
  emitPerfMetric?.({
    metric: 'pluginActivationMs',
    unit: 'ms',
    value: performance.now() - activationStartedAt,
    dimension: plugin.id,
  });
  return plugin;
}
