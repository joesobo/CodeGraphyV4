import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, vi } from 'vitest';
import {
  PathResolver,
  type IDetectedImport,
  type IPythonPathResolverConfig,
} from '../../src/PathResolver';

type PrivatePathResolver = PathResolver & { _fileExists(relativePath: string): boolean };

export type PathResolverHarness = {
  workspaceRoot: string;
  resolver: () => PathResolver;
  createResolver: (config?: IPythonPathResolverConfig) => PathResolver;
  addFile: (relativePath: string) => void;
  createImport: (overrides?: Partial<IDetectedImport>) => IDetectedImport;
  expectAbsPath: (relativePath: string) => string;
  callFileExists: (relativePath: string) => boolean;
  throwOnExistsSync: () => void;
  throwOnStatSync: () => void;
};

export function setupPathResolverHarness(workspaceRoot = '/workspace'): PathResolverHarness {
  let resolver = new PathResolver(workspaceRoot);
  let existingFiles = new Set<string>();

  const createResolver = (config: IPythonPathResolverConfig = {}): PathResolver =>
    new PathResolver(workspaceRoot, config);

  beforeEach(() => {
    resolver = createResolver();
    existingFiles = new Set<string>();

    vi.mocked(fs.existsSync).mockImplementation(filePath => {
      const normalizedPath = String(filePath).replace(/\\/g, '/');
      return existingFiles.has(normalizedPath);
    });

    vi.mocked(fs.statSync).mockImplementation(
      () =>
        ({
          isFile: () => true,
        }) as fs.Stats,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function addFile(relativePath: string): void {
    const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    existingFiles.add(`${workspaceRoot}/${normalizedRelativePath}`);
    existingFiles.add(path.join(workspaceRoot, relativePath).replace(/\\/g, '/'));
  }

  function createImport(overrides: Partial<IDetectedImport> = {}): IDetectedImport {
    return {
      module: '',
      isRelative: false,
      relativeLevel: 0,
      type: 'import',
      line: 1,
      ...overrides,
    };
  }

  function expectAbsPath(relativePath: string): string {
    return path.join(workspaceRoot, relativePath);
  }

  function callFileExists(relativePath: string): boolean {
    return (resolver as unknown as PrivatePathResolver)._fileExists(relativePath);
  }

  function throwOnExistsSync(): void {
    vi.mocked(fs.existsSync).mockImplementation(() => {
      throw new Error('exists failed');
    });
  }

  function throwOnStatSync(): void {
    vi.mocked(fs.statSync).mockImplementation(() => {
      throw new Error('stat failed');
    });
  }

  return {
    workspaceRoot,
    resolver: () => resolver,
    createResolver,
    addFile,
    createImport,
    expectAbsPath,
    callFileExists,
    throwOnExistsSync,
    throwOnStatSync,
  };
}
