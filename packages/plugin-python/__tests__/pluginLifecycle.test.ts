import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ResolverRecord = {
  workspaceRoot: string;
  config: unknown;
  instance: {
    resolve: ReturnType<typeof vi.fn>;
  };
};

const mocks = vi.hoisted(() => ({
  assertPythonAstRuntimeAvailable: vi.fn(),
  parsePythonImports: vi.fn(),
  loadPythonConfig: vi.fn(),
  detectImportModule: vi.fn(),
  detectFromImportAbsolute: vi.fn(),
  detectFromImportRelative: vi.fn(),
  resolverRecords: [] as ResolverRecord[],
}));

vi.mock('../src/astParser', () => ({
  assertPythonAstRuntimeAvailable: mocks.assertPythonAstRuntimeAvailable,
  parsePythonImports: mocks.parsePythonImports,
}));

vi.mock('../src/projectConfig', () => ({
  loadPythonConfig: mocks.loadPythonConfig,
}));

vi.mock('../src/PathResolver', () => ({
  PathResolver: class {
    resolve = vi.fn(() => null);

    constructor(workspaceRoot: string, config: unknown) {
      mocks.resolverRecords.push({
        workspaceRoot,
        config,
        instance: this,
      });
    }
  },
}));

vi.mock('../src/rules/import-module', () => ({
  detect: mocks.detectImportModule,
}));

vi.mock('../src/rules/from-import-absolute', () => ({
  detect: mocks.detectFromImportAbsolute,
}));

vi.mock('../src/rules/from-import-relative', () => ({
  detect: mocks.detectFromImportRelative,
}));

import { createPythonPlugin } from '../src';

describe('createPythonPlugin lifecycle', () => {
  const workspaceRoot = '/workspace';
  const filePath = '/workspace/main.py';
  const content = 'import pkg';
  const parsedImports = [{ kind: 'import', module: 'pkg', line: 1 }];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolverRecords.length = 0;

    mocks.loadPythonConfig.mockResolvedValue({
      sourceRoots: ['src'],
      resolveInitFiles: true,
    });
    mocks.parsePythonImports.mockReturnValue(parsedImports);

    mocks.detectImportModule.mockReturnValue([
      { specifier: 'pkg', resolvedPath: '/workspace/pkg.py', type: 'static', ruleId: 'import-module' },
    ]);
    mocks.detectFromImportAbsolute.mockReturnValue([]);
    mocks.detectFromImportRelative.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialize primes python runtime and resolver', async () => {
    const plugin = createPythonPlugin();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await plugin.initialize?.(workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
    expect(mocks.loadPythonConfig).toHaveBeenCalledWith(workspaceRoot);
    expect(mocks.resolverRecords).toHaveLength(1);
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Python plugin initialized');
  });

  it('detectConnections lazily initializes runtime and resolver when initialize was skipped', async () => {
    const plugin = createPythonPlugin();

    const connections = await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
    expect(mocks.loadPythonConfig).toHaveBeenCalledTimes(1);
    expect(mocks.resolverRecords).toHaveLength(1);
    expect(mocks.parsePythonImports).toHaveBeenCalledWith(content);
    expect(mocks.detectImportModule).toHaveBeenCalledWith(
      content,
      filePath,
      expect.objectContaining({
        imports: parsedImports,
        resolver: mocks.resolverRecords[0].instance,
      }),
    );
    expect(connections).toEqual([
      { specifier: 'pkg', resolvedPath: '/workspace/pkg.py', type: 'static', ruleId: 'import-module' },
    ]);
  });

  it('keeps python runtime marked ready across repeated lazy detect calls', async () => {
    const plugin = createPythonPlugin();

    await plugin.detectConnections(filePath, content, workspaceRoot);
    await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
  });

  it('reuses initialized runtime and resolver across detect calls', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);
    await plugin.detectConnections(filePath, content, workspaceRoot);
    await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
    expect(mocks.loadPythonConfig).toHaveBeenCalledTimes(1);
    expect(mocks.resolverRecords).toHaveLength(1);
    expect(mocks.parsePythonImports).toHaveBeenCalledTimes(2);
  });

  it('onUnload clears runtime state so next detect re-initializes', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();
    await plugin.detectConnections(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(2);
    expect(mocks.loadPythonConfig).toHaveBeenCalledTimes(2);
    expect(mocks.resolverRecords).toHaveLength(2);
  });
});
