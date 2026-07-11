import { describe, expect, it } from 'vitest';
import {
  onPerfMetric,
  startPerfMetricSession,
} from '../../../src/diagnostics/perfMetrics';
import { loadBundledMarkdownPlugin } from '../../../src/plugins/markdown/runtime';

describe('bundled Markdown runtime', () => {
  it('records activation time under the Markdown plugin id', async () => {
    const events: Array<{ context: { dimension?: string; metric: string } }> = [];
    const listener = onPerfMetric(event => events.push(event));
    const session = startPerfMetricSession({ runId: 'markdown-test', scenario: 'cold-open' });

    try {
      await loadBundledMarkdownPlugin();
    } finally {
      session.dispose();
      listener.dispose();
    }

    expect(events).toContainEqual(expect.objectContaining({
      context: expect.objectContaining({
        dimension: 'codegraphy.markdown',
        metric: 'pluginActivationMs',
      }),
    }));
  });
});
