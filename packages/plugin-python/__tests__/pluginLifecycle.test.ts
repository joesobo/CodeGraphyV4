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

vi.mock('../src/sources/import-module', () => ({
  detect: mocks.detectImportModule,
}));

vi.mock('../src/sources/from-import-absolute', () => ({
  detect: mocks.detectFromImportAbsolute,
}));

vi.mock('../src/sources/from-import-relative', () => ({
  detect: mocks.detectFromImportRelative,
}));

import { createPythonPlugin } from '../src/plugin';

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
      { kind: 'import', specifier: 'pkg', resolvedPath: '/workspace/pkg.py', type: 'static', sourceId: 'import-module' },
    ]);
    mocks.detectFromImportAbsolute.mockReturnValue([]);
    mocks.detectFromImportRelative.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialize probes python runtime', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
  });

  it('initialize loads python project configuration', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);

    expect(mocks.loadPythonConfig).toHaveBeenCalledWith(workspaceRoot);
  });

  it('initialize creates one resolver for the workspace', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);

    expect(mocks.resolverRecords).toHaveLength(1);
  });

  it('initialize logs plugin startup', async () => {
    const plugin = createPythonPlugin();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await plugin.initialize?.(workspaceRoot);

    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] Python plugin initialized');
  });

  it('analyzeFile probes python runtime when initialize was skipped', async () => {
    const plugin = createPythonPlugin();

    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
  });

  it('analyzeFile loads project configuration when initialize was skipped', async () => {
    const plugin = createPythonPlugin();

    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.loadPythonConfig).toHaveBeenCalledTimes(1);
  });

  it('analyzeFile creates a resolver when initialize was skipped', async () => {
    const plugin = createPythonPlugin();

    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.resolverRecords).toHaveLength(1);
  });

  it('analyzeFile parses source content before rule detection', async () => {
    const plugin = createPythonPlugin();

    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.parsePythonImports).toHaveBeenCalledWith(content);
  });

  it('analyzeFile passes parsed-import context into import-module detection', async () => {
    const plugin = createPythonPlugin();

    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.detectImportModule).toHaveBeenCalledWith(
      content,
      filePath,
      expect.objectContaining({
        imports: parsedImports,
        resolver: mocks.resolverRecords[0].instance,
      }),
    );
  });

  it('analyzeFile returns per-file relations from the rule detectors', async () => {
    const plugin = createPythonPlugin();

    const analysis = await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(analysis).toEqual({
      filePath,
      relations: [
        {
          kind: 'import',
          specifier: 'pkg',
          resolvedPath: '/workspace/pkg.py',
          toFilePath: '/workspace/pkg.py',
          fromFilePath: filePath,
          type: 'static',
          sourceId: 'import-module',
        },
      ],
    });
  });

  it('analyzeFile returns the expected relations', async () => {
    const plugin = createPythonPlugin();

    const analysis = await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(analysis?.relations).toEqual([
      expect.objectContaining({
        kind: 'import',
        specifier: 'pkg',
        resolvedPath: '/workspace/pkg.py',
        toFilePath: '/workspace/pkg.py',
        fromFilePath: filePath,
        type: 'static',
        sourceId: 'import-module',
      }),
    ]);
  });

  it('keeps python runtime marked ready across repeated lazy analyze calls', async () => {
    const plugin = createPythonPlugin();

    await plugin.analyzeFile?.(filePath, content, workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
  });

  it('analyzeFile reuses runtime after explicit initialize', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(1);
  });

  it('analyzeFile reuses resolver after explicit initialize', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.loadPythonConfig).toHaveBeenCalledTimes(1);
    expect(mocks.resolverRecords).toHaveLength(1);
  });

  it('analyzeFile still parses each file on every analyze call', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.parsePythonImports).toHaveBeenCalledTimes(2);
  });

  it('onUnload clears runtime state so next analyze re-initializes', async () => {
    const plugin = createPythonPlugin();

    await plugin.initialize?.(workspaceRoot);
    plugin.onUnload?.();
    await plugin.analyzeFile?.(filePath, content, workspaceRoot);

    expect(mocks.assertPythonAstRuntimeAvailable).toHaveBeenCalledTimes(2);
    expect(mocks.loadPythonConfig).toHaveBeenCalledTimes(2);
    expect(mocks.resolverRecords).toHaveLength(2);
  });
});
