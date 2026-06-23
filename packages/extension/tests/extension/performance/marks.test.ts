import { mkdtemp, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EXTENSION_PERFORMANCE_LOG_PATH_ENV,
  recordExtensionPerformanceEvent,
} from '../../../src/extension/performance/marks';

describe('extension/performance/marks', () => {
  let originalLogPath: string | undefined;

  beforeEach(() => {
    originalLogPath = process.env[EXTENSION_PERFORMANCE_LOG_PATH_ENV];
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T12:00:00.123Z'));
  });

  afterEach(() => {
    if (originalLogPath === undefined) {
      delete process.env[EXTENSION_PERFORMANCE_LOG_PATH_ENV];
    } else {
      process.env[EXTENSION_PERFORMANCE_LOG_PATH_ENV] = originalLogPath;
    }

    vi.useRealTimers();
  });

  it('does nothing when the extension performance log path is not configured', async () => {
    delete process.env[EXTENSION_PERFORMANCE_LOG_PATH_ENV];
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-perf-'));
    const logPath = path.join(tempRoot, 'extension-host.jsonl');

    recordExtensionPerformanceEvent('graphWebview.resolve.start');

    await expect(stat(logPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('appends one JSONL event per extension host performance marker', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-perf-'));
    const logPath = path.join(tempRoot, 'nested', 'extension-host.jsonl');
    process.env[EXTENSION_PERFORMANCE_LOG_PATH_ENV] = logPath;

    recordExtensionPerformanceEvent('graphWebview.resolve.start', {
      visible: true,
      viewKind: 'graph',
    });
    vi.setSystemTime(new Date('2026-06-22T12:00:00.456Z'));
    recordExtensionPerformanceEvent('graphWebview.resolve.end');

    const lines = (await readFile(logPath, 'utf8')).trim().split('\n');

    expect(lines.map(line => JSON.parse(line))).toEqual([
      {
        name: 'graphWebview.resolve.start',
        at: 1782129600123,
        detail: {
          visible: true,
          viewKind: 'graph',
        },
      },
      {
        name: 'graphWebview.resolve.end',
        at: 1782129600456,
      },
    ]);
  });
});
