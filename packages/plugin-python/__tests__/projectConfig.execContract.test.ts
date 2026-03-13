import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock('child_process', () => ({
  __esModule: true,
  execFileSync: execFileSyncMock,
  default: {
    execFileSync: execFileSyncMock,
  },
}));

describe('projectConfig subprocess contract', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    vi.resetModules();
    execFileSyncMock.mockReset();
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-python-project-config-mock-'));
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('invokes python source-root discovery with a bounded parser buffer', async () => {
    execFileSyncMock.mockReturnValue(Buffer.from('["src"]', 'utf8'));
    const { __test, loadPythonConfig } = await import('../src/projectConfig');

    const config = await loadPythonConfig(workspaceRoot);

    expect(config).toEqual({ sourceRoots: ['src'], resolveInitFiles: true });
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'python3',
      ['-c', __test.PYTHON_SOURCE_ROOT_DISCOVERY_SCRIPT, workspaceRoot],
      { maxBuffer: 1024 * 1024 * 5 },
    );
  });

  it('falls back to default config and warns when source-root discovery fails', async () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('python discovery failed');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { loadPythonConfig } = await import('../src/projectConfig');

    const config = await loadPythonConfig(workspaceRoot);

    expect(config).toEqual({ sourceRoots: [], resolveInitFiles: true });
    expect(warnSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to parse python project config:',
      expect.any(Error),
    );
  });

  it('exposes a non-empty source-root discovery script with expected sections', async () => {
    const { __test } = await import('../src/projectConfig');

    expect(__test.PYTHON_SOURCE_ROOT_DISCOVERY_SCRIPT).toContain('source_roots');
    expect(__test.PYTHON_SOURCE_ROOT_DISCOVERY_SCRIPT).toContain('parse_pyproject');
  });
});
