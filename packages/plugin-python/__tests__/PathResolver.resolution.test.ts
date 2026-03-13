import { describe, expect, it, vi } from 'vitest';
import { setupPathResolverHarness } from './helpers/pathResolverHarness';

vi.mock('fs');

describe('PathResolver resolution', () => {
  const harness = setupPathResolverHarness();

  describe('absolute imports', () => {
    it('resolves a simple module to a .py file', () => {
      harness.addFile('utils.py');

      const resolved = harness.resolver().resolve(harness.createImport({ module: 'utils' }), 'main.py');

      expect(resolved).toBe(harness.expectAbsPath('utils.py'));
    });

    it('resolves dotted module paths', () => {
      harness.addFile('mypackage/utils.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({ module: 'mypackage.utils' }),
        'main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('mypackage/utils.py'));
    });

    it('resolves deeply nested modules', () => {
      harness.addFile('mypackage/subpackage/module.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({ module: 'mypackage.subpackage.module' }),
        'main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('mypackage/subpackage/module.py'));
    });

    it('resolves package modules to __init__.py', () => {
      harness.addFile('mypackage/__init__.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({ module: 'mypackage' }),
        'main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('mypackage/__init__.py'));
    });

    it('skips __init__.py resolution when init-file support is disabled', () => {
      harness.addFile('mypackage/__init__.py');
      const resolverWithoutInit = harness.createResolver({ resolveInitFiles: false });

      const resolved = resolverWithoutInit.resolve(harness.createImport({ module: 'mypackage' }), 'main.py');

      expect(resolved).toBeNull();
    });

    it('prefers .py over package __init__.py for the same module', () => {
      harness.addFile('utils.py');
      harness.addFile('utils/__init__.py');

      const resolved = harness.resolver().resolve(harness.createImport({ module: 'utils' }), 'main.py');

      expect(resolved).toBe(harness.expectAbsPath('utils.py'));
    });

    it('searches common source directories for unresolved top-level modules', () => {
      harness.addFile('src/mymodule.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({ module: 'mymodule' }),
        'main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('src/mymodule.py'));
    });

    it('resolves .pyi stub files when no .py file exists', () => {
      harness.addFile('types.pyi');

      const resolved = harness.resolver().resolve(harness.createImport({ module: 'types' }), 'main.py');

      expect(resolved).toBe(harness.expectAbsPath('types.pyi'));
    });

    it('returns null for unresolved modules', () => {
      const resolved = harness.resolver().resolve(
        harness.createImport({ module: 'nonexistent' }),
        'main.py',
      );

      expect(resolved).toBeNull();
    });
  });

  describe('relative imports', () => {
    it('resolves same-directory imports for single-dot syntax', () => {
      harness.addFile('package/utils.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({
          module: 'utils',
          isRelative: true,
          relativeLevel: 1,
          type: 'from',
        }),
        'package/main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('package/utils.py'));
    });

    it('resolves parent-directory imports for double-dot syntax', () => {
      harness.addFile('package/helpers.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({
          module: 'helpers',
          isRelative: true,
          relativeLevel: 2,
          type: 'from',
        }),
        'package/subpackage/main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('package/helpers.py'));
    });

    it('resolves parent-package module imports', () => {
      harness.addFile('config.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({
          module: 'config',
          isRelative: true,
          relativeLevel: 2,
          type: 'from',
        }),
        'package/main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('config.py'));
    });

    it('resolves nested modules in relative import statements', () => {
      harness.addFile('package/utils/helpers.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({
          module: 'utils.helpers',
          isRelative: true,
          relativeLevel: 1,
          type: 'from',
        }),
        'package/main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('package/utils/helpers.py'));
    });

    it('resolves sibling modules for relative imports', () => {
      harness.addFile('package/sibling.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({
          module: 'sibling',
          isRelative: true,
          relativeLevel: 1,
          type: 'from',
        }),
        'package/current.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('package/sibling.py'));
    });

    it('resolves relative package modules to __init__.py', () => {
      harness.addFile('package/subpackage/__init__.py');

      const resolved = harness.resolver().resolve(
        harness.createImport({
          module: 'subpackage',
          isRelative: true,
          relativeLevel: 1,
          type: 'from',
        }),
        'package/main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('package/subpackage/__init__.py'));
    });
  });

  describe('configured source roots', () => {
    it('resolves imports from configured source roots', () => {
      harness.addFile('lib/external.py');
      const resolverWithRoots = harness.createResolver({ sourceRoots: ['lib', 'vendor'] });

      const resolved = resolverWithRoots.resolve(
        harness.createImport({ module: 'external' }),
        'main.py',
      );

      expect(resolved).toBe(harness.expectAbsPath('lib/external.py'));
    });

    it('does not resolve from mutated implicit roots when no source roots are configured', () => {
      harness.addFile('Stryker was here/ghost.py');

      const resolved = harness.resolver().resolve(harness.createImport({ module: 'ghost' }), 'main.py');

      expect(resolved).toBeNull();
    });
  });
});
