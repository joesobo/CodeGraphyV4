import { describe, expect, it } from 'vitest';
import {
  buildStrykerCommand,
  discoverMutationPackages,
  resolveMutationOptions,
  shouldRunAsMain,
} from '../../../../scripts/run-mutate';

describe('run-mutate script', () => {
  it('uses stryker config mutate globs for full extension runs', () => {
    const options = resolveMutationOptions('extension');

    expect(options.mutatePattern).toBeUndefined();
    expect(buildStrykerCommand(options, 'reports/mutation/extension/stryker-incremental-extension.json', {})).not.toContain(
      ' -m ',
    );
  });

  it('passes generic src globs for non-extension package runs', () => {
    const options = resolveMutationOptions('plugin-godot');

    expect(options.mutatePattern).toContain('packages/plugin-godot/src/**/*.ts');
    expect(options.mutatePattern).toContain('packages/plugin-godot/src/**/*.tsx');
    expect(options.mutatePattern).toContain('!**/index.tsx');
    expect(options.mutatePattern).not.toContain('!packages/extension/src/**/webview/components/icons/**');
    expect(buildStrykerCommand(options, 'reports/mutation/plugin-godot/stryker-incremental-plugin-godot.json', {})).toContain(
      ' -m ',
    );
  });

  it('still passes explicit mutate globs for targeted extension runs', () => {
    const options = resolveMutationOptions(
      'extension',
      'packages/extension/src/webview/store.ts,packages/extension/src/webview/storeMessages.ts',
    );

    expect(options.mutatePattern).toContain('packages/extension/src/webview/store.ts');
    expect(
      buildStrykerCommand(
        options,
        'reports/mutation/extension/packages-extension-src-webview-store.ts/stryker-incremental-extension-packages-extension-src-webview-store.ts.json',
        {},
      ),
    ).toContain(' -m ');
  });

  it('detects direct script execution without import.meta', () => {
    expect(shouldRunAsMain('/workspace/scripts/run-mutate.ts')).toBe(true);
    expect(shouldRunAsMain('/workspace/node_modules/vitest/vitest.mjs')).toBe(false);
    expect(shouldRunAsMain(undefined)).toBe(false);
  });

  it('discovers mutation packages from the workspace instead of a hardcoded list', () => {
    expect(discoverMutationPackages()).toEqual([
      'plugin-csharp',
      'plugin-godot',
      'plugin-markdown',
      'plugin-python',
      'plugin-typescript',
      'extension',
    ]);
  });
});
