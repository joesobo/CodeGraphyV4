import { describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import {
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
} from '../../../../src/shared/contracts';
import {
  areGraphViewSetsEqual,
  getGraphViewConfigTarget,
  normalizeDirectionColor,
  normalizeFolderNodeColor,
  readGraphViewSettings,
  resolveGraphViewDisabledState,
} from '../../../../src/extension/graphView/settings/config';

describe('graphView/settings/config', () => {
  it('normalizes invalid direction colors to the default', () => {
    expect(normalizeDirectionColor('not-a-color')).toBe(DEFAULT_DIRECTION_COLOR);
  });

  it('normalizes invalid folder colors to the default', () => {
    expect(normalizeFolderNodeColor('bad-folder-color')).toBe(DEFAULT_FOLDER_NODE_COLOR);
  });

  it('returns workspace config target when workspace folders exist', () => {
    expect(getGraphViewConfigTarget([{ uri: vscode.Uri.file('/workspace') }])).toBe(
      vscode.ConfigurationTarget.Workspace
    );
  });

  it('returns global config target when no workspace folders exist', () => {
    expect(getGraphViewConfigTarget(undefined)).toBe(vscode.ConfigurationTarget.Global);
  });

  it('treats sets with the same members as equal', () => {
    expect(areGraphViewSetsEqual(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
  });

  it('treats sets with different sizes as unequal', () => {
    expect(areGraphViewSetsEqual(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });

  it('treats sets with missing members as unequal', () => {
    expect(areGraphViewSetsEqual(new Set(['a', 'b']), new Set(['a', 'c']))).toBe(false);
  });

  it('prefers configured disabled state over stored fallback state', () => {
    const result = resolveGraphViewDisabledState(
      new Set(['old-rule']),
      new Set(['old-plugin']),
      ['configured-rule'],
      ['configured-plugin'],
      ['stored-rule'],
      ['stored-plugin']
    );

    expect([...result.disabledRules]).toEqual(['configured-rule']);
    expect([...result.disabledPlugins]).toEqual(['configured-plugin']);
    expect(result.changed).toBe(true);
  });

  it('falls back to stored disabled state when config values are absent', () => {
    const result = resolveGraphViewDisabledState(
      new Set(['stored-rule']),
      new Set(['stored-plugin']),
      undefined,
      undefined,
      ['stored-rule'],
      ['stored-plugin']
    );

    expect([...result.disabledRules]).toEqual(['stored-rule']);
    expect([...result.disabledPlugins]).toEqual(['stored-plugin']);
    expect(result.changed).toBe(false);
  });

  it('reads graph view settings with normalized defaults', () => {
    const config = {
      get<T>(_section: string, defaultValue: T): T {
        return defaultValue;
      },
    };

    expect(readGraphViewSettings(config)).toEqual({
      bidirectionalEdges: 'separate',
      showOrphans: true,
      directionMode: 'arrows',
      particleSpeed: 0.005,
      particleSize: 4,
      directionColor: DEFAULT_DIRECTION_COLOR,
      folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
      showLabels: true,
    });
  });

  it('reads configured graph view settings and preserves valid colors', () => {
    const values = new Map<string, unknown>([
      ['bidirectionalEdges', 'combined'],
      ['showOrphans', false],
      ['directionMode', 'particles'],
      ['particleSpeed', 0.02],
      ['particleSize', 7],
      ['directionColor', '#00ff00'],
      ['folderNodeColor', '#112233'],
      ['showLabels', false],
    ]);
    const config = {
      get<T>(section: string, defaultValue: T): T {
        return (values.get(section) as T | undefined) ?? defaultValue;
      },
    };

    expect(readGraphViewSettings(config)).toEqual({
      bidirectionalEdges: 'combined',
      showOrphans: false,
      directionMode: 'particles',
      particleSpeed: 0.02,
      particleSize: 7,
      directionColor: '#00FF00',
      folderNodeColor: '#112233',
      showLabels: false,
    });
  });
});
