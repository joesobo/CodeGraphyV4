import { describe, expect, it } from 'vitest';
import { assertScenarioPreconditions } from '../../../../../src/extension/perf/scenarios/fileMutation/preconditions';

describe('extension/perf/scenarios/fileMutation/preconditions', () => {
  it('validates rename source and destination preconditions', () => {
    const before = new Map([
      ['src/old.ts', { exists: true as const, contents: new Uint8Array() }],
      ['src/new.ts', { exists: false as const }],
    ]);

    expect(() => assertScenarioPreconditions(
      'rename',
      { kind: 'rename', oldPath: 'src/old.ts', newPath: 'src/new.ts' },
      before,
    )).not.toThrow();
  });

  it('validates create destination preconditions', () => {
    expect(() => assertScenarioPreconditions(
      'create',
      { kind: 'create', filePath: 'src/new.ts' },
      new Map([['src/new.ts', { exists: false as const }]]),
    )).not.toThrow();
  });

  it('validates every delete source precondition', () => {
    expect(() => assertScenarioPreconditions(
      'delete',
      { kind: 'delete', paths: ['src/a.ts', 'src/b.ts'] },
      new Map([
        ['src/a.ts', { exists: true as const, contents: new Uint8Array() }],
        ['src/b.ts', { exists: true as const, contents: new Uint8Array() }],
      ]),
    )).not.toThrow();
  });
});
