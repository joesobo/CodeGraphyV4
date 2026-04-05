import { describe, expect, it, vi } from 'vitest';
import type { IDetectedImport } from '../src/PathResolver';
import type { PythonRuleContext } from '../src/context';
import { detect as detectFromImportAbsolute } from '../src/sources/from-import-absolute';
import { buildFromImportConnections } from '../src/sources/from-import-shared';
import { detect as detectImportModule } from '../src/sources/import-module';

function createContext(
  resolveImpl: (imp: IDetectedImport, fromFile: string) => string | null,
): { ctx: PythonRuleContext; resolve: ReturnType<typeof vi.fn> } {
  const resolve = vi.fn(resolveImpl);
  const resolver = {
    resolve,
  };

  return {
    ctx: {
      resolver: resolver as unknown as PythonRuleContext['resolver'],
      imports: [],
    },
    resolve,
  };
}

describe('python rule detectors', () => {
  it('builds relative from-import connections for named members', () => {
    const { ctx, resolve } = createContext((imp) => {
      if (imp.module === 'pkg.member') {
        return '/workspace/pkg/member.py';
      }
      return null;
    });

    const connections = buildFromImportConnections(
      '/workspace/current.py',
      {
        kind: 'from',
        module: 'pkg',
        names: ['member'],
        level: 2,
        line: 8,
      },
      ctx,
      'from-import-relative',
    );

    expect(connections).toEqual([
      {
        kind: 'import',
        specifier: 'from ..pkg import member',
        resolvedPath: '/workspace/pkg/member.py',
        type: 'static',
        sourceId: 'from-import-relative',
      },
    ]);

    expect(resolve).toHaveBeenCalledWith(
      {
        module: 'pkg',
        names: ['member'],
        isRelative: true,
        relativeLevel: 2,
        type: 'from',
        line: 8,
      },
      '/workspace/current.py',
    );
  });

  it('resolves wildcard from-import connections to the package module', () => {
    const { ctx } = createContext((imp) => {
      if (imp.module === 'pkg.*') {
        return '/workspace/pkg/wildcard-should-not-win.py';
      }
      if (imp.module === 'pkg') {
        return '/workspace/pkg/__init__.py';
      }
      return null;
    });

    const connections = buildFromImportConnections(
      '/workspace/current.py',
      {
        kind: 'from',
        module: 'pkg',
        names: ['*'],
        level: 2,
        line: 8,
      },
      ctx,
      'from-import-relative',
    );

    expect(connections).toEqual([
      {
        kind: 'import',
        specifier: 'from ..pkg import *',
        resolvedPath: '/workspace/pkg/__init__.py',
        type: 'static',
        sourceId: 'from-import-relative',
      },
    ]);
  });

  it('filters from-import-absolute entries to level 0 with non-empty module names', () => {
    const { ctx } = createContext((imp) => {
      if (imp.module === 'pkg.mod') {
        return '/workspace/pkg/mod.py';
      }
      if (imp.module === 'pkg') {
        return '/workspace/pkg/__init__.py';
      }
      return null;
    });

    ctx.imports = [
      { kind: 'import', module: 'os', line: 1 },
      { kind: 'import', module: 'pkg', names: ['mod'], level: 0, line: 2 } as unknown as (typeof ctx.imports)[number],
      { kind: 'from', module: '', names: ['ignored'], level: 0, line: 2 },
      { kind: 'from', module: 'pkg', names: ['mod'], level: 0, line: 3 },
      { kind: 'from', module: 'pkg', names: ['rel'], level: 1, line: 4 },
    ];

    const connections = detectFromImportAbsolute('', '/workspace/main.py', ctx);

    expect(connections).toEqual([
      {
        kind: 'import',
        specifier: 'from pkg import mod',
        resolvedPath: '/workspace/pkg/mod.py',
        type: 'static',
        sourceId: 'from-import-absolute',
      },
    ]);
  });

  it('builds static import-module connections', () => {
    const { ctx } = createContext(() => '/workspace/pkg.py');

    ctx.imports = [
      { kind: 'import', module: 'pkg', line: 7 },
      { kind: 'from', module: 'pkg', names: ['ignored'], level: 0, line: 8 },
    ];

    const connections = detectImportModule('', '/workspace/main.py', ctx);

    expect(connections).toEqual([
      {
        kind: 'import',
        specifier: 'pkg',
        resolvedPath: '/workspace/pkg.py',
        type: 'static',
        sourceId: 'import-module',
      },
    ]);
  });

  it('passes absolute import payload to the resolver for import-module detection', () => {
    const { ctx, resolve } = createContext(() => '/workspace/pkg.py');

    ctx.imports = [{ kind: 'import', module: 'pkg', line: 7 }];

    detectImportModule('', '/workspace/main.py', ctx);

    expect(resolve).toHaveBeenCalledWith(
      {
        module: 'pkg',
        isRelative: false,
        relativeLevel: 0,
        type: 'import',
        line: 7,
      },
      '/workspace/main.py',
    );
  });
});
