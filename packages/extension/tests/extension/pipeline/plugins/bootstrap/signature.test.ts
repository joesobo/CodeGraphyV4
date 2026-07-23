import { describe, expect, it } from 'vitest';
import { createWorkspacePluginRuntimeSignature } from '../../../../../src/extension/pipeline/plugins/bootstrap/signature';

const record = {
  package: '@acme/codegraphy-plugin',
  version: '1.2.3',
  packageRoot: '/plugins/acme',
  globallyEnabled: true,
  id: 'acme.language',
  name: 'Acme Language',
  host: 'core',
  entry: './dist/plugin.js',
  apiVersion: '^4.0.0',
};

const runtime = {
  id: 'acme.language',
  name: 'Acme Language',
  version: '1.2.3',
  apiVersion: '^4.0.0',
};

const identityChanges: Array<[
  string,
  {
    buildIdentity?: string;
    record?: Partial<typeof record>;
    runtime?: Partial<typeof runtime>;
  },
]> = [
  ['descriptor entry', { record: { entry: './dist/next.js' } }],
  ['descriptor API range', { record: { apiVersion: '>=4.0.0 <5.0.0' } }],
  ['package version', { record: { version: '1.2.4' } }],
  ['runtime version', { runtime: { version: '1.2.4' } }],
  ['runtime API range', { runtime: { apiVersion: '>=4.0.0 <5.0.0' } }],
  ['build content', { buildIdentity: 'build-v2' }],
];

describe('workspace plugin runtime signature', () => {
  it.each(identityChanges)('changes when the %s changes', (_label, change) => {
    const original = createWorkspacePluginRuntimeSignature(record, runtime, 'build-v1');
    const changed = createWorkspacePluginRuntimeSignature(
      { ...record, ...change.record },
      { ...runtime, ...change.runtime },
      change.buildIdentity ?? 'build-v1',
    );

    expect(changed).not.toBe(original);
  });
});
