import { describe, expect, it } from 'vitest';
import {
  createEmptyCSharpIndex,
  resolveCSharpTypePath,
  resolveCSharpTypePathInNamespace,
  setCSharpWorkspaceIndex,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';

describe('pipeline/plugins/treesitter/runtime/csharpIndex/resolve', () => {
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
});
