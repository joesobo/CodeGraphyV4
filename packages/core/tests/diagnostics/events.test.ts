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

  it('formats events with a stable prefix, area, event, and JSON context', () => {
    expect(formatDiagnosticEventLine({
      area: 'indexing',
      event: 'completed',
      context: {
        operationId: 'index-1',
        nodeCount: 12,
      },
    })).toBe('[CodeGraphy][Diagnostics] indexing completed {"operationId":"index-1","nodeCount":12}');
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
