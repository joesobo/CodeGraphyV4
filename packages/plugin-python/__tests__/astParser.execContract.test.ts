import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('astParser subprocess contract', () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSyncMock.mockReset();
  });

  it('checks python runtime availability with the expected probe command', async () => {
    execFileSyncMock.mockReturnValue(Buffer.from('3\n', 'utf8'));
    const { assertPythonAstRuntimeAvailable } = await import('../src/astParser');

    assertPythonAstRuntimeAvailable();

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'python3',
      ['-c', 'import ast, sys; print(sys.version_info[0])'],
    );
  });

  it('passes the embedded parser script to subprocess execution', async () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(JSON.stringify([{ kind: 'import', module: 'os', line: 1 }]), 'utf8'),
    );
    const { __test, parsePythonImports } = await import('../src/astParser');

    expect(parsePythonImports('import os')).toEqual([{ kind: 'import', module: 'os', line: 1 }]);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'python3',
      ['-c', __test.PYTHON_AST_SCRIPT],
      expect.any(Object),
    );
  });

  it('uses a bounded subprocess buffer when parsing imports', async () => {
    execFileSyncMock.mockReturnValue(
      Buffer.from(JSON.stringify([{ kind: 'import', module: 'os', line: 1 }]), 'utf8'),
    );
    const { parsePythonImports } = await import('../src/astParser');

    parsePythonImports('import os');

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'python3',
      expect.any(Array),
      {
        input: 'import os',
        maxBuffer: 1024 * 1024 * 10,
      },
    );
  });

  it('exposes a non-empty AST script with the expected parser primitives', async () => {
    const { __test } = await import('../src/astParser');

    expect(__test.PYTHON_AST_SCRIPT).toContain('import ast');
    expect(__test.PYTHON_AST_SCRIPT).toContain('json.dumps');
  });
});
