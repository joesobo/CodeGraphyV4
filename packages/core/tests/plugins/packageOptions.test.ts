import { describe, expect, it } from 'vitest';
import type { CodeGraphyInstalledPluginRecord } from '../../src';
import { mergePluginOptions } from '../../src/plugins/packageOptions';

function createRecord(
  id: string,
  defaultOptions: Record<string, unknown>,
): CodeGraphyInstalledPluginRecord {
  return {
    package: '@acme/codegraphy-tools',
    version: '1.0.0',
    packageRoot: '/plugins/acme-tools',
    globallyEnabled: true,
    id,
    host: 'core',
    entry: `./${id}.js`,
    apiVersion: '^4.0.0',
    data: { defaultOptions },
  } satisfies CodeGraphyInstalledPluginRecord;
}

describe('package plugin options', () => {
  it('merges descriptor defaults per plugin before workspace overrides', () => {
    const strictPlugin = createRecord('acme.strict', {
      mode: 'strict',
      includeTests: false,
    });
    const loosePlugin = createRecord('acme.loose', {
      mode: 'loose',
      includeTests: true,
    });

    expect(mergePluginOptions(strictPlugin, {
      id: strictPlugin.id,
      activation: 'enabled',
      options: { includeTests: true },
    })).toEqual({ mode: 'strict', includeTests: true });
    expect(mergePluginOptions(loosePlugin, {
      id: loosePlugin.id,
      activation: 'enabled',
    })).toEqual({ mode: 'loose', includeTests: true });
  });
});
