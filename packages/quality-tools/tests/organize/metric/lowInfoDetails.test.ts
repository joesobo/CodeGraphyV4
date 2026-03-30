import { describe, expect, it } from 'vitest';
import { LOW_INFO_NAME_DETAILS } from '../../../src/organize/metric/lowInfoDetails';

describe('LOW_INFO_NAME_DETAILS', () => {
  describe('banned name details', () => {
    it('includes utils detail', () => {
      expect(LOW_INFO_NAME_DETAILS.utils).toContain('Catch-all dumping ground');
    });

    it('includes helpers detail', () => {
      expect(LOW_INFO_NAME_DETAILS.helpers).toContain('Vague semantics');
    });

    it('includes misc detail', () => {
      expect(LOW_INFO_NAME_DETAILS.misc).toContain('uncategorized');
    });

    it('includes common detail', () => {
      expect(LOW_INFO_NAME_DETAILS.common).toContain('unrelated shared code');
    });

    it('includes shared detail', () => {
      expect(LOW_INFO_NAME_DETAILS.shared).toContain('architectural layers');
    });

    it('includes _shared detail', () => {
      expect(LOW_INFO_NAME_DETAILS._shared).toContain('Variant of shared');
    });

    it('includes lib detail', () => {
      expect(LOW_INFO_NAME_DETAILS.lib).toContain('Too generic');
    });

    it('includes index detail', () => {
      expect(LOW_INFO_NAME_DETAILS.index).toContain('IDE tabs');
    });
  });

  describe('discouraged name details', () => {
    it('includes types detail', () => {
      expect(LOW_INFO_NAME_DETAILS.types).toContain('dump for unrelated type definitions');
    });

    it('includes constants detail', () => {
      expect(LOW_INFO_NAME_DETAILS.constants).toContain('dump for unrelated values');
    });

    it('includes config detail', () => {
      expect(LOW_INFO_NAME_DETAILS.config).toContain('Vague without domain context');
    });

    it('includes base detail', () => {
      expect(LOW_INFO_NAME_DETAILS.base).toContain('Abstract without inheritance context');
    });

    it('includes core detail', () => {
      expect(LOW_INFO_NAME_DETAILS.core).toContain('Too broad');
    });
  });

  describe('structure', () => {
    it('is a record with string keys and string values', () => {
      expect(typeof LOW_INFO_NAME_DETAILS).toBe('object');
      for (const [key, value] of Object.entries(LOW_INFO_NAME_DETAILS)) {
        expect(typeof key).toBe('string');
        expect(typeof value).toBe('string');
      }
    });

    it('contains 13 entries', () => {
      expect(Object.keys(LOW_INFO_NAME_DETAILS).length).toBe(13);
    });

    it('has expected keys', () => {
      const expectedKeys = [
        'utils', 'helpers', 'misc', 'common', 'shared', '_shared', 'lib', 'index',
        'types', 'constants', 'config', 'base', 'core'
      ];
      for (const key of expectedKeys) {
        expect(LOW_INFO_NAME_DETAILS).toHaveProperty(key);
      }
    });

    it('all values are non-empty strings', () => {
      for (const value of Object.values(LOW_INFO_NAME_DETAILS)) {
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  describe('detail text characteristics', () => {
    it('details explain the problem', () => {
      // Each detail should explain why the name is problematic
      const details = Object.values(LOW_INFO_NAME_DETAILS);
      for (const detail of details) {
        // Details should be meaningful explanations
        expect(detail.length).toBeGreaterThan(10);
      }
    });

    it('details are distinct and meaningful', () => {
      const values = Object.values(LOW_INFO_NAME_DETAILS);
      // All values should be different
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
