import { describe, expect, it } from 'vitest';
import {
  collectDiagnosticEvents,
  createDiagnosticEvent,
  formatDiagnosticEventLine,
} from '../../src/diagnostics/events';

describe('diagnostics/events', () => {
  it('collects JSON-safe diagnostic events only when enabled', () => {
    const collected = collectDiagnosticEvents(true);

    collected.emit(createDiagnosticEvent({
      area: 'graph-cache',
      event: 'load',
      context: {
        operationId: 'index-1',
        workspacePath: '/workspace/project',
        paths: new Set(['src/a.ts', 'src/b.ts']),
        error: new Error('cache unavailable'),
      },
    }));

    expect(collected.events).toEqual([{
      area: 'graph-cache',
      event: 'load',
      context: {
        operationId: 'index-1',
        workspacePath: '/workspace/project',
        paths: ['src/a.ts', 'src/b.ts'],
        error: {
          name: 'Error',
          message: 'cache unavailable',
        },
      },
    }]);

    const disabled = collectDiagnosticEvents(false);
    disabled.emit(createDiagnosticEvent({
      area: 'indexing',
      event: 'started',
      context: { operationId: 'index-2' },
    }));

    expect(disabled.events).toEqual([]);
  });

  it('formats events as concise human-readable CodeGraphy log lines', () => {
    expect(formatDiagnosticEventLine({
      area: 'indexing',
      event: 'completed',
      context: {
        operationId: 'index-1',
        files: 4,
        nodes: 12,
        edges: 20,
      },
    })).toBe('[CodeGraphy] Indexing complete: 4 files, 12 nodes, 20 edges, operation=index-1');

    expect(formatDiagnosticEventLine({
      area: 'indexing',
      event: 'phase-completed',
      context: {
        phase: 'analyze-files',
        durationMs: 2750,
        files: 42,
        cacheHits: 20,
        cacheMisses: 22,
      },
    })).toBe('[CodeGraphy] Indexing phase complete: phase=analyze-files, durationMs=2750, files=42, cacheHits=20, cacheMisses=22');
  });

  it('normalizes non-JSON primitive context values into readable strings', () => {
    function namedDiagnosticFunction(): void {
      // The function name is the diagnostic payload under test.
    }

    expect(createDiagnosticEvent({
      area: 'diagnostics',
      event: 'normalized',
      context: {
        missing: undefined,
        token: Symbol('verbose'),
        count: 12n,
        callback: namedDiagnosticFunction,
      },
    })).toEqual({
      area: 'diagnostics',
      event: 'normalized',
      context: {
        missing: 'undefined',
        token: 'Symbol(verbose)',
        count: '12',
        callback: '[Function: namedDiagnosticFunction]',
      },
    });
  });
});
