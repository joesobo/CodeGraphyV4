import { describe, expect, it, vi } from 'vitest';
import type { CSharpRuleContext } from '../src/parserTypes';
import rule, { detect } from '../src/sources/type-usage';

describe('type-usage', () => {
  it('exports the expected rule descriptor shape', () => {
    expect(rule.id).toBe('type-usage');
    expect(rule.detect).toBe(detect);
  });

  it('returns one reference per resolved path for a namespace', () => {
    const usedTypes = new Set<string>(['Worker']);
    const resolveIntraNamespace = vi.fn(() => ['/workspace/src/Services/Worker.cs']);

    const ctx = {
      usings: [],
      namespaces: [{ name: 'MyApp.Services', isFileScoped: true, line: 1 }],
      usedTypes,
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
        specifier: '[same namespace: MyApp.Services]',
        resolvedPath: '/workspace/src/Services/Worker.cs',
        fromFilePath: '/workspace/src/Program.cs',
        toFilePath: '/workspace/src/Services/Worker.cs',
        type: 'static',
        sourceId: 'type-usage',
      },
    ]);
    expect(resolveIntraNamespace).toHaveBeenCalledWith(
      'MyApp.Services',
      '/workspace/src/Program.cs',
      usedTypes,
    );
  });
});
