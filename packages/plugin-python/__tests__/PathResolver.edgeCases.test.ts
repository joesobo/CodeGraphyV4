import { describe, expect, it, vi } from 'vitest';
import { setupPathResolverHarness } from './helpers/pathResolverHarness';

vi.mock('fs');

describe('PathResolver edge cases', () => {
  const harness = setupPathResolverHarness();

  it('accepts absolute source file paths when resolving imports', () => {
    harness.addFile('utils.py');

    const resolved = harness.resolver().resolve(
      harness.createImport({ module: 'utils' }),
      '/workspace/main.py',
    );

    expect(resolved).toBe(harness.expectAbsPath('utils.py'));
  });

  it('handles windows-style source file paths', () => {
    harness.addFile('mypackage/utils.py');

    const resolved = harness.resolver().resolve(
      harness.createImport({ module: 'mypackage.utils' }),
      'src\\main.py',
    );

    expect(resolved).toBe(harness.expectAbsPath('mypackage/utils.py'));
  });

  it('normalizes backslashes in module names before lookup', () => {
    harness.addFile('mypackage/utils.py');

    const resolved = harness.resolver().resolve(
      harness.createImport({ module: 'mypackage\\\\utils' }),
      'main.py',
    );

    expect(resolved).toBe(harness.expectAbsPath('mypackage/utils.py'));
  });

  it('resolves empty-module relative imports to the parent package init file', () => {
    harness.addFile('package/__init__.py');

    const resolved = harness.resolver().resolve(
      harness.createImport({
        module: '',
        isRelative: true,
        relativeLevel: 2,
        type: 'from',
        names: ['something'],
      }),
      'package/subpackage/main.py',
    );

    expect(resolved).toBe(harness.expectAbsPath('package/__init__.py'));
  });

  it('returns null when statSync throws during file checks', () => {
    harness.addFile('broken.py');
    harness.throwOnStatSync();

    const resolved = harness.resolver().resolve(
      harness.createImport({ module: 'broken' }),
      'main.py',
    );

    expect(resolved).toBeNull();
  });

  it('treats existsSync errors as missing files', () => {
    harness.throwOnExistsSync();

    expect(harness.callFileExists('any.py')).toBe(false);
  });
});
