/**
 * @fileoverview Tests for C# PathResolver.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PathResolver } from '../../../src/plugins/csharp/PathResolver';
import { IDetectedUsing, IDetectedNamespace } from '../../../src/plugins/csharp/ImportDetector';

// Mock fs module
vi.mock('fs');

describe('C# PathResolver', () => {
  const workspaceRoot = '/workspace';
  let resolver: PathResolver;
  let existingFiles: Set<string>;
  let existingDirs: Set<string>;

  beforeEach(() => {
    resolver = new PathResolver(workspaceRoot);
    existingFiles = new Set();
    existingDirs = new Set();

    vi.mocked(fs.existsSync).mockImplementation((filePath) => {
      const normalized = String(filePath).replace(/\\/g, '/');
      return existingFiles.has(normalized) || existingDirs.has(normalized);
    });

    vi.mocked(fs.statSync).mockImplementation((filePath) => {
      const normalized = String(filePath).replace(/\\/g, '/');
      return {
        isFile: () => existingFiles.has(normalized),
        isDirectory: () => existingDirs.has(normalized),
      } as fs.Stats;
    });

    vi.mocked(fs.readdirSync).mockImplementation(() => []);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function addFile(relativePath: string): void {
    const normalized = relativePath.replace(/\\/g, '/');
    const fullPath = `${workspaceRoot}/${normalized}`;
    existingFiles.add(fullPath);
  }

  function addDir(relativePath: string): void {
    const normalized = relativePath.replace(/\\/g, '/');
    const fullPath = `${workspaceRoot}/${normalized}`;
    existingDirs.add(fullPath);
  }

  function createUsing(namespace: string, options: Partial<IDetectedUsing> = {}): IDetectedUsing {
    return {
      namespace,
      isStatic: false,
      isGlobal: false,
      line: 1,
      ...options,
    };
  }

  function createNamespace(name: string, isFileScoped = true): IDetectedNamespace {
    return { name, isFileScoped, line: 1 };
  }

  describe('namespace registration', () => {
    it('should register and resolve namespaces', () => {
      resolver.registerNamespace(createNamespace('MyApp.Services'), 'Services/UserService.cs');
      
      const using = createUsing('MyApp.Services');
      const resolved = resolver.resolve(using, 'Program.cs');
      
      expect(resolved).toBe('/workspace/Services/UserService.cs');
    });

    it('should handle multiple files in same namespace', () => {
      resolver.registerNamespace(createNamespace('MyApp.Services'), 'Services/UserService.cs');
      resolver.registerNamespace(createNamespace('MyApp.Services'), 'Services/OrderService.cs');
      
      // Should return the last registered file
      const using = createUsing('MyApp.Services');
      const resolved = resolver.resolve(using, 'Program.cs');
      
      expect(resolved).toBe('/workspace/Services/OrderService.cs');
    });
  });

  describe('convention-based resolution', () => {
    it('should resolve namespace to matching file path', () => {
      addFile('Services/UserService.cs');
      
      const using = createUsing('MyApp.Services.UserService');
      const resolverWithRoot = new PathResolver(workspaceRoot, { rootNamespace: 'MyApp' });
      const resolved = resolverWithRoot.resolve(using, 'Program.cs');
      
      expect(resolved).toBe('/workspace/Services/UserService.cs');
    });

    it('should search in src directory', () => {
      addFile('src/Services/UserService.cs');
      
      const using = createUsing('MyApp.Services.UserService');
      const resolverWithRoot = new PathResolver(workspaceRoot, { 
        rootNamespace: 'MyApp',
        sourceDirs: ['', 'src'],
      });
      const resolved = resolverWithRoot.resolve(using, 'Program.cs');
      
      expect(resolved).toBe('/workspace/src/Services/UserService.cs');
    });
  });

  describe('external namespace detection', () => {
    it('should return null for System namespaces', () => {
      const using = createUsing('System.Collections.Generic');
      const resolved = resolver.resolve(using, 'Program.cs');
      expect(resolved).toBeNull();
    });

    it('should return null for Microsoft namespaces', () => {
      const using = createUsing('Microsoft.Extensions.Logging');
      const resolved = resolver.resolve(using, 'Program.cs');
      expect(resolved).toBeNull();
    });

    it('should return null for common NuGet packages', () => {
      const packages = [
        'Newtonsoft.Json',
        'AutoMapper',
        'Serilog',
        'MediatR',
        'FluentValidation',
      ];
      
      for (const pkg of packages) {
        const using = createUsing(pkg);
        const resolved = resolver.resolve(using, 'Program.cs');
        expect(resolved).toBeNull();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle using static', () => {
      resolver.registerNamespace(createNamespace('MyApp.Utils'), 'Utils/MathHelper.cs');
      
      const using = createUsing('MyApp.Utils', { isStatic: true });
      const resolved = resolver.resolve(using, 'Program.cs');
      
      expect(resolved).toBe('/workspace/Utils/MathHelper.cs');
    });

    it('should handle global using', () => {
      resolver.registerNamespace(createNamespace('MyApp.Common'), 'Common/Extensions.cs');
      
      const using = createUsing('MyApp.Common', { isGlobal: true });
      const resolved = resolver.resolve(using, 'GlobalUsings.cs');
      
      expect(resolved).toBe('/workspace/Common/Extensions.cs');
    });

    it('should handle using alias', () => {
      resolver.registerNamespace(createNamespace('MyApp.Data.Entities'), 'Data/Entities/User.cs');
      
      const using = createUsing('MyApp.Data.Entities', { alias: 'Entities' });
      const resolved = resolver.resolve(using, 'Program.cs');
      
      expect(resolved).toBe('/workspace/Data/Entities/User.cs');
    });
  });
});
