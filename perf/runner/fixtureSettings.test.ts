import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { serializePerfFixtureSettings } from './fixtureSettings';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('performance fixture settings', () => {
  it('serializes the canonical default settings without runtime normalization', () => {
    const serialized = serializePerfFixtureSettings({
      fileCount: 100,
      include: ['src/**/*.ts'],
      symbols: false,
    });

    const settings = JSON.parse(serialized) as Record<string, unknown>;
    expect(Object.keys(settings)).toHaveLength(31);
    expect(settings).toMatchObject({
      version: 1,
      maxFiles: 100,
      include: ['src/**/*.ts'],
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'codegraphy.typescript', enabled: true },
      ],
    });
    expect(sha256(serialized)).toBe(
      'e0ecf38f6688694fdbf76eb149b8f531d1c0b45b6c0528aa7f3bd59a5cff0fe7',
    );
    expect(serialized.endsWith('\n')).toBe(true);
  });

  it('enables the complete symbol scope used by symbol benchmarks', () => {
    const settings = JSON.parse(serializePerfFixtureSettings({
      fileCount: 100,
      include: ['src/**/*.ts'],
      symbols: true,
    })) as { nodeVisibility?: Record<string, unknown> };

    expect(Object.entries(settings.nodeVisibility ?? {})
      .filter(([, visible]) => visible === true)
      .map(([nodeType]) => nodeType)).toEqual([
      'file',
      'symbol',
      'symbol:function',
      'symbol:namespace',
      'symbol:callable',
      'symbol:method',
      'symbol:constructor',
      'symbol:prototype',
      'symbol:class',
      'symbol:mixin',
      'symbol:extension',
      'symbol:interface',
      'symbol:record',
      'symbol:delegate',
      'symbol:property',
      'symbol:event',
      'symbol:type',
      'symbol:struct',
      'symbol:union',
      'symbol:enum',
      'symbol:typedef',
      'symbol:alias',
      'symbol:template',
      'plugin:codegraphy.gdscript:symbol:scene',
      'plugin:codegraphy.gdscript:symbol:resource',
      'plugin:codegraphy.gdscript:symbol:autoload',
      'plugin:codegraphy.gdscript:symbol:scene-node',
      'plugin:codegraphy.gdscript:symbol:signal',
      'variable',
      'variable:plain',
      'symbol:constant',
      'symbol:global',
      'symbol:field',
      'symbol:parameter',
      'symbol:local',
      'plugin:codegraphy.gdscript:symbol:godot-class-name',
      'plugin:codegraphy.gdscript:symbol:exported-property',
      'plugin:codegraphy.unity:symbol',
      'plugin:codegraphy.unity:symbol:game-object',
      'plugin:codegraphy.unity:symbol:component',
    ]);
    expect(sha256(serializePerfFixtureSettings({
      fileCount: 100,
      include: ['src/**/*.ts'],
      symbols: true,
    }))).toBe('65e1725bb28c9cf09a1209c4bb0904532dcece8428bc8ab88e9e65fd83b14ff0');
  });
});
