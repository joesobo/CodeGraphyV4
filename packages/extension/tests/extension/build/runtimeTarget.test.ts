import {
  getExtensionRuntimePackageNames,
  resolveExtensionRuntimeTarget,
} from '../../../scripts/externalPackages';

describe('extension runtime target', () => {
  it('selects target-specific native runtime packages', () => {
    expect(getExtensionRuntimePackageNames('darwin-arm64')).toEqual(
      expect.arrayContaining([
        '@libsql/darwin-arm64',
        '@esbuild/darwin-arm64',
        'tree-sitter',
      ]),
    );
    expect(getExtensionRuntimePackageNames('darwin-arm64')).not.toContain(
      '@libsql/linux-x64-gnu',
    );
  });

  it('uses one explicit VSIX target when the build provides it', () => {
    expect(resolveExtensionRuntimeTarget({
      environment: { CODEGRAPHY_VSIX_TARGETS: 'darwin-arm64' },
      platform: 'darwin',
      arch: 'arm64',
    })).toBe('darwin-arm64');
  });
});
