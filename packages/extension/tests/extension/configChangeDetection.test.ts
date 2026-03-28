import { describe, it, expect } from 'vitest';
import { classifyConfigChange } from '../../src/extension/configChangeDetection';

function makeEvent(...matchingKeys: string[]) {
  const keySet = new Set(matchingKeys);
  return {
    affectsConfiguration: (key: string) => keySet.has(key),
  };
}

describe('classifyConfigChange', () => {
  describe('physics category', () => {
    it('returns physics when codegraphy.physics is affected', () => {
      const event = makeEvent('codegraphy.physics');
      expect(classifyConfigChange(event)).toBe('physics');
    });

    it('returns physics even when other keys are also affected', () => {
      const event = makeEvent('codegraphy.physics', 'codegraphy.showLabels', 'codegraphy');
      expect(classifyConfigChange(event)).toBe('physics');
    });
  });

  describe('toggles category', () => {
    it('returns toggles when codegraphy.disabledRules is affected', () => {
      const event = makeEvent('codegraphy.disabledRules');
      expect(classifyConfigChange(event)).toBe('toggles');
    });

    it('returns toggles when codegraphy.disabledPlugins is affected', () => {
      const event = makeEvent('codegraphy.disabledPlugins');
      expect(classifyConfigChange(event)).toBe('toggles');
    });

    it('returns toggles when both disabled settings are affected', () => {
      const event = makeEvent('codegraphy.disabledRules', 'codegraphy.disabledPlugins');
      expect(classifyConfigChange(event)).toBe('toggles');
    });
  });

  describe('display category', () => {
    it('returns display when codegraphy.directionMode is affected', () => {
      const event = makeEvent('codegraphy.directionMode');
      expect(classifyConfigChange(event)).toBe('display');
    });

    it('returns display when codegraphy.directionColor is affected', () => {
      const event = makeEvent('codegraphy.directionColor');
      expect(classifyConfigChange(event)).toBe('display');
    });

    it('returns display when codegraphy.particleSpeed is affected', () => {
      const event = makeEvent('codegraphy.particleSpeed');
      expect(classifyConfigChange(event)).toBe('display');
    });

    it('returns display when codegraphy.particleSize is affected', () => {
      const event = makeEvent('codegraphy.particleSize');
      expect(classifyConfigChange(event)).toBe('display');
    });

    it('returns display when codegraphy.showLabels is affected', () => {
      const event = makeEvent('codegraphy.showLabels');
      expect(classifyConfigChange(event)).toBe('display');
    });

    it('returns display when codegraphy.bidirectionalEdges is affected', () => {
      const event = makeEvent('codegraphy.bidirectionalEdges');
      expect(classifyConfigChange(event)).toBe('display');
    });
  });

  describe('groups category', () => {
    it('returns groups when codegraphy.groups is affected', () => {
      const event = makeEvent('codegraphy.groups');
      expect(classifyConfigChange(event)).toBe('groups');
    });

    it('returns groups when codegraphy.hiddenPluginGroups is affected', () => {
      const event = makeEvent('codegraphy.hiddenPluginGroups');
      expect(classifyConfigChange(event)).toBe('groups');
    });
  });

  describe('general category', () => {
    it('returns general when only codegraphy root is affected', () => {
      const event = makeEvent('codegraphy');
      expect(classifyConfigChange(event)).toBe('general');
    });

    it('returns general when codegraphy is affected but no specific sub-key matches', () => {
      const event = makeEvent('codegraphy', 'codegraphy.maxFiles');
      expect(classifyConfigChange(event)).toBe('general');
    });
  });

  describe('null return', () => {
    it('returns null when no codegraphy configuration is affected', () => {
      const event = makeEvent('editor.fontSize');
      expect(classifyConfigChange(event)).toBeNull();
    });

    it('returns null when affectsConfiguration always returns false', () => {
      const event = { affectsConfiguration: () => false };
      expect(classifyConfigChange(event)).toBeNull();
    });
  });

  describe('priority ordering', () => {
    it('physics takes priority over toggles', () => {
      const event = makeEvent('codegraphy.physics', 'codegraphy.disabledRules');
      expect(classifyConfigChange(event)).toBe('physics');
    });

    it('toggles takes priority over display', () => {
      const event = makeEvent('codegraphy.disabledRules', 'codegraphy.showLabels');
      expect(classifyConfigChange(event)).toBe('toggles');
    });

    it('display takes priority over groups', () => {
      const event = makeEvent('codegraphy.showLabels', 'codegraphy.groups');
      expect(classifyConfigChange(event)).toBe('display');
    });

    it('groups takes priority over general', () => {
      const event = makeEvent('codegraphy.groups', 'codegraphy');
      expect(classifyConfigChange(event)).toBe('groups');
    });
  });
});
