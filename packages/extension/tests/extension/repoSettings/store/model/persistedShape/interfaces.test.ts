import { describe, expect, it } from 'vitest';
import { normalizePersistedSettingsShape } from '../../../../../../src/extension/repoSettings/store/model/persistedShape';

describe('extension/repoSettings persisted interface shape', () => {
  it('preserves open interface data as an array keyed by interface id', () => {
    expect(normalizePersistedSettingsShape({
      interfaces: [
        { id: 'codegraphy.extension', data: { pinnedNodes: [{ id: 'src/app.ts', x: 10, y: 20 }] } },
        { id: 'future.interface', data: ['unknown', 'shape'] },
      ],
    })).toEqual({
      interfaces: [
        { id: 'codegraphy.extension', data: { pinnedNodes: [{ id: 'src/app.ts', x: 10, y: 20 }] } },
        { id: 'future.interface', data: ['unknown', 'shape'] },
      ],
    });
  });

  it.each([{}, null, 'invalid'])('drops a non-array interfaces value', interfaces => {
    expect(normalizePersistedSettingsShape({ interfaces })).toEqual({});
  });

  it('drops invalid envelopes without inspecting valid interface data', () => {
    expect(normalizePersistedSettingsShape({
      interfaces: [
        null,
        'invalid',
        { data: {} },
        { id: 42, data: {} },
        { id: '', data: {} },
        { id: '   ', data: {} },
        { id: 'missing.data' },
        { id: 'future.interface', data: null },
      ],
    })).toEqual({
      interfaces: [{ id: 'future.interface', data: null }],
    });
  });
});
