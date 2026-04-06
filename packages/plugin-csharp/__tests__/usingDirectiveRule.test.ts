import { describe, it, expect, vi } from 'vitest';
import { detect, default as rule } from '../src/sources/using-directive';
import type { CSharpRuleContext } from '../src/parserTypes';
import type { IDetectedUsing } from '../src/parserTypes';

describe('using-directive rule', () => {
  function createUsing(namespace: string, overrides: Partial<IDetectedUsing> = {}): IDetectedUsing {
    return {
      namespace,
      line: 1,
      isGlobal: false,
      isStatic: false,
      ...overrides,
    };
  }

  it('builds correct specifiers for regular, global, static, and alias using directives', () => {
    const resolveWithTypes = vi.fn((usingDirective: IDetectedUsing) => {
      if (usingDirective.namespace === 'MyApp.Regular') return ['/workspace/Regular.cs'];
      if (usingDirective.namespace === 'MyApp.Global') return ['/workspace/Global.cs'];
      if (usingDirective.namespace === 'MyApp.StaticMath') return ['/workspace/StaticMath.cs'];
      if (usingDirective.namespace === 'MyApp.Serialization') return ['/workspace/Serialization.cs'];
      return [];
    });

    const ctx = {
      usings: [
        createUsing('MyApp.Regular'),
        createUsing('MyApp.Global', { isGlobal: true }),
        createUsing('MyApp.StaticMath', { isStatic: true }),
        createUsing('MyApp.Serialization', { alias: 'Json' }),
      ],
      namespaces: [],
      usedTypes: new Set<string>(['Regular', 'Global', 'StaticMath', 'Serialization']),
      resolver: {
        resolveWithTypes,
        resolveIntraNamespace: vi.fn(),
        resolve: vi.fn(),
        registerNamespace: vi.fn(),
      },
    } as unknown as CSharpRuleContext;

    const connections = detect('', '/workspace/src/Program.cs', ctx);

    expect(connections).toEqual([
      {
        kind: 'import',
        specifier: 'using MyApp.Regular',
        resolvedPath: '/workspace/Regular.cs',
        type: 'static',
        sourceId: 'using-directive',
      },
      {
        kind: 'import',
        specifier: 'global using MyApp.Global',
        resolvedPath: '/workspace/Global.cs',
        type: 'static',
        sourceId: 'using-directive',
      },
      {
        kind: 'import',
        specifier: 'using static MyApp.StaticMath',
        resolvedPath: '/workspace/StaticMath.cs',
        type: 'static',
        sourceId: 'using-directive',
      },
      {
        kind: 'import',
        specifier: 'using Json = MyApp.Serialization',
        resolvedPath: '/workspace/Serialization.cs',
        type: 'static',
        sourceId: 'using-directive',
      },
    ]);

    expect(resolveWithTypes).toHaveBeenCalledTimes(4);
  });

  it('returns no connections when resolver does not resolve any path', () => {
    const ctx = {
      usings: [createUsing('MyApp.Missing')],
      namespaces: [],
      usedTypes: new Set<string>(),
      resolver: {
        resolveWithTypes: vi.fn(() => []),
        resolveIntraNamespace: vi.fn(),
        resolve: vi.fn(),
        registerNamespace: vi.fn(),
      },
    } as unknown as CSharpRuleContext;

    expect(detect('', '/workspace/src/Program.cs', ctx)).toEqual([]);
  });

  it('exports a rule descriptor with expected id', () => {
    expect(rule.id).toBe('using-directive');
    expect(rule.detect).toBe(detect);
  });
});
