import { describe, expect, it } from 'vitest';
import { extractSignalSymbols } from '../../../src/plugin/symbol/gdscriptSignals';

describe('extractSignalSymbols', () => {
  it('extracts GDScript signals with plugin metadata', () => {
    const symbols = extractSignalSymbols([
      'class_name HealthComponent',
      'signal health_changed(current: int, maximum: int)',
      'signal died',
      'func emit_later() -> void:',
      '\thealth_changed.emit(1, 2)',
    ].join('\n'), '/workspace/game/scripts/health_component.gd', 'scripts/health_component.gd');

    expect(symbols).toEqual([
      {
        id: 'scripts/health_component.gd#health_changed:signal',
        name: 'health_changed',
        kind: 'signal',
        filePath: '/workspace/game/scripts/health_component.gd',
        signature: 'signal health_changed(current: int, maximum: int)',
        range: {
          startLine: 2,
          startColumn: 8,
          endLine: 2,
          endColumn: 22,
        },
        metadata: {
          language: 'gdscript',
          pluginKind: 'signal',
          source: 'codegraphy.gdscript',
        },
      },
      {
        id: 'scripts/health_component.gd#died:signal',
        name: 'died',
        kind: 'signal',
        filePath: '/workspace/game/scripts/health_component.gd',
        signature: 'signal died',
        range: {
          startLine: 3,
          startColumn: 8,
          endLine: 3,
          endColumn: 12,
        },
        metadata: {
          language: 'gdscript',
          pluginKind: 'signal',
          source: 'codegraphy.gdscript',
        },
      },
    ]);
  });
});
