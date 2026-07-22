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
    expect(normalizePersistedSettingsShape({ interfaces: {} })).toEqual({});
  });
});
