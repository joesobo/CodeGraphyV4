import { describe, expect, it } from 'vitest';

import { migratePersistedSettings } from '../../../../../src/extension/repoSettings/store/model/migrate';

describe('persisted repository settings migration', () => {
  it('upgrades only the historical physics defaults from version one', () => {
    expect(migratePersistedSettings({
      version: 1,
      physics: {
        centerForce: 0.25,
        damping: 0.7,
        linkDistance: 140,
        linkForce: 0.15,
        repelForce: 6,
      },
    })).toEqual({
      version: 2,
      physics: {
        centerForce: 0.25,
        damping: 0.4,
        linkDistance: 140,
        linkForce: 1,
        repelForce: 6,
      },
    });

    expect(migratePersistedSettings({
      version: 1,
      physics: { damping: 0.2, linkForce: 0.6 },
    })).toEqual({
      version: 2,
      physics: { damping: 0.2, linkForce: 0.6 },
    });
  });

  it('leaves current and invalid settings unchanged', () => {
    const current = { version: 2, physics: { damping: 0.7, linkForce: 0.15 } };
    expect(migratePersistedSettings(current)).toBe(current);
    expect(migratePersistedSettings(null)).toBeNull();
  });
});
