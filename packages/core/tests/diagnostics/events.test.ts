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

  it('formats unknown events with readable fallback context', () => {
    expect(formatDiagnosticEventLine({
      area: 'graph-cache',
      event: 'cache-load-failed',
      context: {
        operationId: 'index-1',
      },
    })).toBe('[CodeGraphy] Cache load failed: area=graph-cache, operationId=index-1');
  });

  it('formats graph query and extension lifecycle events', () => {
    expect(formatDiagnosticEventLine({
      area: 'extension.analysis', event: 'request-started', context: { requestId: 'request-1', mode: 'full' },
    })).toContain('Starting analysis:');
    expect(formatDiagnosticEventLine({
      area: 'graph-query', event: 'started', context: { report: 'nodes', operationId: 'query-1', workspaceRoot: '/workspace' },
    })).toContain('Starting Graph Query:');
    expect(formatDiagnosticEventLine({
      area: 'graph-query', event: 'cache-missing', context: { report: 'nodes', cacheState: 'missing' },
    })).toContain('Graph Cache missing:');
    expect(formatDiagnosticEventLine({
      area: 'graph-query', event: 'completed', context: { report: 'nodes', nodeCount: 2, edgeCount: 1 },
    })).toContain('Graph Query complete:');
    expect(formatDiagnosticEventLine({
      area: 'extension.lifecycle', event: 'activation-started', context: { workspaceFolders: 1 },
    })).toContain('Extension activation started:');
    expect(formatDiagnosticEventLine({
      area: 'extension.lifecycle', event: 'activation-completed', context: { registeredWebviewProviders: 1 },
    })).toContain('Extension activation complete:');
    expect(formatDiagnosticEventLine({
      area: 'extension.webview', event: 'ready-replayed', context: { hasWorkspace: true },
    })).toContain('Webview ready replayed:');
    expect(formatDiagnosticEventLine({
      area: 'extension.webview', event: 'bootstrap-completed', context: { hasWorkspace: true },
    })).toContain('Webview bootstrap complete:');
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

  it('normalizes nested object context values into JSON-safe values', () => {
    expect(createDiagnosticEvent({
      area: 'diagnostics',
      event: 'nested',
      context: {
        payload: {
          enabled: true,
          paths: new Set(['src/app.ts']),
          error: new Error('nested failure'),
        },
      },
    })).toEqual({
      area: 'diagnostics',
      event: 'nested',
      context: {
        payload: {
          enabled: true,
          paths: ['src/app.ts'],
          error: {
            name: 'Error',
            message: 'nested failure',
          },
        },
      },
    });
  });
});
