import { describe, expect, it } from 'vitest';
import {
  onPerfMetric,
  startPerfMetricSession,
  type PerfMetricDiagnosticEvent,
} from '../../src/diagnostics/perfMetrics';
import { analyzeFileWithTreeSitter } from '../../src/treeSitter/runtime/analyze';

describe('pipeline/plugins/treesitter/runtime/analyze performance metrics', () => {
  it('reports the tree-sitter parse duration while metric collection is armed', async () => {
    const received: PerfMetricDiagnosticEvent[] = [];
    const subscription = onPerfMetric(event => received.push(event));
    const session = startPerfMetricSession({
      runId: 'tree-sitter-run',
      scenario: 'cold-open',
    });

    try {
      await analyzeFileWithTreeSitter(
        '/workspace/app.ts',
        'export const ready = true;\n',
        '/workspace',
      );

      expect(received).toEqual([
        expect.objectContaining({
          context: expect.objectContaining({
            metric: 'treeSitterParseMs',
            unit: 'ms',
            dimension: 'typescript',
            filePath: 'app.ts',
            value: expect.any(Number),
          }),
        }),
      ]);
      expect(received[0]?.context.value).toBeGreaterThanOrEqual(0);
    } finally {
      session.dispose();
      subscription.dispose();
    }
  });
});
