import { describe, expect, it } from 'vitest';
import { formatCliResult } from '../../../src/cli/result/serializer';

describe('cli/result/serializer', () => {
  it('keeps successful help and version output as plain text', () => {
    expect(formatCliResult({ name: 'help' }, { exitCode: 0, output: 'usage' })).toBe('usage');
    expect(formatCliResult({ name: 'version' }, { exitCode: 0, output: '3.0.0' })).toBe('3.0.0');
  });

  it('wraps JSON and plain-text success data', () => {
    expect(JSON.parse(formatCliResult(
      { name: 'query', report: 'nodes', invokedCommand: 'search' },
      { exitCode: 0, output: '{"nodes":[]}' },
    ))).toEqual({ ok: true, command: 'search', data: { nodes: [] } });
    expect(JSON.parse(formatCliResult(
      { name: 'index' },
      { exitCode: 0, output: 'complete' },
    ))).toEqual({ ok: true, command: 'index', data: 'complete' });
  });

  it('normalizes structured, plain-text, and incomplete failures', () => {
    expect(JSON.parse(formatCliResult(
      { name: 'filter' },
      { exitCode: 2, output: '{"error":"invalid_arguments","message":"bad glob","action":"Retry."}' },
    )).error).toEqual({ code: 'invalid_arguments', message: 'bad glob', action: 'Retry.' });
    expect(JSON.parse(formatCliResult(
      { name: 'index' },
      { exitCode: 1, output: 'database unavailable' },
    )).error).toEqual({ code: 'command_failed', message: 'database unavailable' });
    expect(JSON.parse(formatCliResult(
      { name: 'index' },
      { exitCode: 1, output: '{}' },
    )).error).toEqual({ code: 'command_failed', message: 'Command failed.' });
  });

  it('keeps unhealthy doctor checks inside the error envelope', () => {
    expect(JSON.parse(formatCliResult(
      { name: 'doctor' },
      { exitCode: 1, output: '{"healthy":false,"checks":{}}' },
    ))).toEqual({
      ok: false,
      command: 'doctor',
      error: {
        code: 'workspace_unhealthy',
        message: 'Workspace checks failed.',
        action: 'Review the failed checks and run their suggested actions.',
        details: { healthy: false, checks: {} },
      },
    });
  });

  it('preserves doctor argument errors instead of treating them as health results', () => {
    expect(JSON.parse(formatCliResult(
      { name: 'doctor' },
      { exitCode: 2, output: '{"error":"invalid_arguments","message":"Unexpected argument: wat"}' },
    ))).toEqual({
      ok: false,
      command: 'doctor',
      error: {
        code: 'invalid_arguments',
        message: 'Unexpected argument: wat',
      },
    });
  });
});
