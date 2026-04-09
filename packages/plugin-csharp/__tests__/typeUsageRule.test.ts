import { describe, it, expect, vi } from 'vitest';
import { detect, default as rule } from '../src/sources/type-usage';
import type { CSharpRuleContext } from '../src/parserTypes';

describe('type-usage rule', () => {
  it('creates one connection per resolved intra-namespace type', () => {
    const usedTypes = new Set<string>(['Worker', 'Config', 'Entity']);
    const resolveIntraNamespace = vi.fn((namespace: string) => {
      if (namespace === 'MyApp.Services') {
        return ['/workspace/src/Services/Worker.cs', '/workspace/src/Services/Config.cs'];
      }
      return ['/workspace/src/Domain/Entity.cs'];
    });

    const ctx = {
      usings: [],
      namespaces: [
        { name: 'MyApp.Services', isFileScoped: true, line: 1 },
        { name: 'MyApp.Domain', isFileScoped: true, line: 2 },
      ],
      usedTypes,
      resolver: {
        resolveIntraNamespace,
        resolveWithTypes: vi.fn(),
        resolve: vi.fn(),
        registerNamespace: vi.fn(),
      },
    } as unknown as CSharpRuleContext;

    const connections = detect('', '/workspace/src/Program.cs', ctx);

    expect(connections).toEqual([
      {
        kind: 'reference',
        specifier: '[same namespace: MyApp.Services]',
        resolvedPath: '/workspace/src/Services/Worker.cs',
        fromFilePath: '/workspace/src/Program.cs',
        toFilePath: '/workspace/src/Services/Worker.cs',
        type: 'static',
        sourceId: 'type-usage',
      },
      {
        kind: 'reference',
        specifier: '[same namespace: MyApp.Services]',
        resolvedPath: '/workspace/src/Services/Config.cs',
        fromFilePath: '/workspace/src/Program.cs',
        toFilePath: '/workspace/src/Services/Config.cs',
        type: 'static',
        sourceId: 'type-usage',
      },
      {
        kind: 'reference',
        specifier: '[same namespace: MyApp.Domain]',
        resolvedPath: '/workspace/src/Domain/Entity.cs',
        fromFilePath: '/workspace/src/Program.cs',
        toFilePath: '/workspace/src/Domain/Entity.cs',
        type: 'static',
        sourceId: 'type-usage',
      },
    ]);

    expect(resolveIntraNamespace).toHaveBeenCalledTimes(2);
    expect(resolveIntraNamespace).toHaveBeenNthCalledWith(
      1,
      'MyApp.Services',
      '/workspace/src/Program.cs',
      usedTypes,
    );
    expect(resolveIntraNamespace).toHaveBeenNthCalledWith(
      2,
      'MyApp.Domain',
      '/workspace/src/Program.cs',
      usedTypes,
    );
  });

  it('returns empty results when no namespace declarations exist', () => {
    const ctx = {
      usings: [],
      namespaces: [],
      usedTypes: new Set<string>(),
      resolver: {
        resolveIntraNamespace: vi.fn(() => []),
        resolveWithTypes: vi.fn(),
        resolve: vi.fn(),
        registerNamespace: vi.fn(),
      },
    } as unknown as CSharpRuleContext;

    expect(detect('', '/workspace/src/Program.cs', ctx)).toEqual([]);
  });

  it('skips namespaces that resolve to no connections', () => {
    const resolveIntraNamespace = vi
      .fn()
      .mockReturnValueOnce([])
      .mockReturnValueOnce(['/workspace/src/Domain/Entity.cs']);

    const ctx = {
      usings: [],
      namespaces: [
        { name: 'MyApp.Services', isFileScoped: true, line: 1 },
        { name: 'MyApp.Domain', isFileScoped: true, line: 2 },
      ],
      usedTypes: new Set<string>(['Entity']),
      resolver: {
        resolveIntraNamespace,
        resolveWithTypes: vi.fn(),
        resolve: vi.fn(),
        registerNamespace: vi.fn(),
      },
    } as unknown as CSharpRuleContext;

    expect(detect('', '/workspace/src/Program.cs', ctx)).toEqual([
      {
        kind: 'reference',
        specifier: '[same namespace: MyApp.Domain]',
        resolvedPath: '/workspace/src/Domain/Entity.cs',
        fromFilePath: '/workspace/src/Program.cs',
        toFilePath: '/workspace/src/Domain/Entity.cs',
        type: 'static',
        sourceId: 'type-usage',
      },
    ]);
  });

  it('exports a rule descriptor with expected id', () => {
    expect(rule.id).toBe('type-usage');
    expect(rule.detect).toBe(detect);
  });
});
