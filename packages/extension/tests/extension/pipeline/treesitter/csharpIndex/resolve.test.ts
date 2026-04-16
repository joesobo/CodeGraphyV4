import { describe, expect, it } from 'vitest';
import {
  createEmptyCSharpIndex,
  resolveCSharpTypePath,
  resolveCSharpTypePathInNamespace,
  setCSharpWorkspaceIndex,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';

describe('pipeline/plugins/treesitter/runtime/csharpIndex/resolve', () => {
  it('returns null when the workspace does not have a C# index', () => {
    expect(
      resolveCSharpTypePath(
        '/missing-workspace',
        '/missing-workspace/src/Program.cs',
        'ApiService',
        'MyApp.Services',
        ['MyApp.Shared'],
      ),
    ).toBeNull();

    expect(
      resolveCSharpTypePathInNamespace(
        '/missing-workspace',
        '/missing-workspace/src/Program.cs',
        'MyApp.Services',
        'ApiService',
      ),
    ).toBeNull();
  });

  it('resolves types from the current namespace, using namespaces, and fully qualified names', () => {
    const workspaceRoot = '/workspace';
    const index = createEmptyCSharpIndex();
    index.typesByQualifiedName.set('MyApp.Services.ApiService', {
      filePath: '/workspace/src/Services/ApiService.cs',
      namespaceName: 'MyApp.Services',
      typeName: 'ApiService',
    });
    setCSharpWorkspaceIndex(workspaceRoot, index);

    expect(
      resolveCSharpTypePath(
        workspaceRoot,
        '/workspace/src/Program.cs',
        'ApiService',
        'MyApp.Services',
        [],
      ),
    ).toBe('/workspace/src/Services/ApiService.cs');

    expect(
      resolveCSharpTypePath(
        workspaceRoot,
        '/workspace/src/Program.cs',
        'ApiService',
        null,
        ['MyApp.Services'],
      ),
    ).toBe('/workspace/src/Services/ApiService.cs');

    expect(
      resolveCSharpTypePath(
        workspaceRoot,
        '/workspace/src/Program.cs',
        'MyApp.Services.ApiService',
        null,
        [],
      ),
    ).toBe('/workspace/src/Services/ApiService.cs');
  });

  it('skips same-file and missing candidates before falling back to later namespace matches', () => {
    const workspaceRoot = '/workspace-using';
    const index = createEmptyCSharpIndex();
    index.typesByQualifiedName.set('MyApp.Services.ApiService', {
      filePath: '/workspace-using/src/Program.cs',
      namespaceName: 'MyApp.Services',
      typeName: 'ApiService',
    });
    index.typesByQualifiedName.set('MyApp.Shared.ApiService', {
      filePath: '/workspace-using/src/Shared/ApiService.cs',
      namespaceName: 'MyApp.Shared',
      typeName: 'ApiService',
    });
    index.typesByQualifiedName.set('ApiService', {
      filePath: '/workspace-using/src/Fallback/ApiService.cs',
      namespaceName: '',
      typeName: 'ApiService',
    });
    setCSharpWorkspaceIndex(workspaceRoot, index);

    expect(
      resolveCSharpTypePath(
        workspaceRoot,
        '/workspace-using/src/Program.cs',
        'ApiService',
        'MyApp.Services',
        ['MyApp.Missing', 'MyApp.Shared'],
      ),
    ).toBe('/workspace-using/src/Shared/ApiService.cs');
  });

  it('falls back to unqualified names when no namespace candidate resolves', () => {
    const workspaceRoot = '/workspace-fallback';
    const index = createEmptyCSharpIndex();
    index.typesByQualifiedName.set('ApiService', {
      filePath: '/workspace-fallback/src/Fallback/ApiService.cs',
      namespaceName: '',
      typeName: 'ApiService',
    });
    setCSharpWorkspaceIndex(workspaceRoot, index);

    expect(
      resolveCSharpTypePath(
        workspaceRoot,
        '/workspace-fallback/src/Program.cs',
        'ApiService',
        null,
        ['MyApp.Missing'],
      ),
    ).toBe('/workspace-fallback/src/Fallback/ApiService.cs');
  });

  it('ignores matches from the same file and resolves namespace-specific lookups', () => {
    const workspaceRoot = '/workspace-2';
    const index = createEmptyCSharpIndex();
    index.typesByQualifiedName.set('MyApp.Services.ApiService', {
      filePath: '/workspace-2/src/Services/ApiService.cs',
      namespaceName: 'MyApp.Services',
      typeName: 'ApiService',
    });
    setCSharpWorkspaceIndex(workspaceRoot, index);

    expect(
      resolveCSharpTypePathInNamespace(
        workspaceRoot,
        '/workspace-2/src/Program.cs',
        'MyApp.Services',
        'ApiService',
      ),
    ).toBe('/workspace-2/src/Services/ApiService.cs');

    expect(
      resolveCSharpTypePathInNamespace(
        workspaceRoot,
        '/workspace-2/src/Services/ApiService.cs',
        'MyApp.Services',
        'ApiService',
      ),
    ).toBeNull();
  });

  it('returns null for namespace-specific lookups when the namespace is missing', () => {
    const workspaceRoot = '/workspace-3';
    const index = createEmptyCSharpIndex();
    setCSharpWorkspaceIndex(workspaceRoot, index);

    expect(
      resolveCSharpTypePathInNamespace(
        workspaceRoot,
        '/workspace-3/src/Program.cs',
        'MyApp.Services',
        'ApiService',
      ),
    ).toBeNull();
  });
});
