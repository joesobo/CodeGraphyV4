import { describe, expect, it } from 'vitest';
import { GDScriptPathResolver } from '../../src/PathResolver';
import {
  extractClassNames,
  extractResourceUid,
  readChangedAnalysisTargets,
  registerGodotFileMetadata,
} from '../../src/plugin/metadata';

describe('Godot plugin metadata extraction', () => {
  it('extracts resource UIDs from scene and resource headers only', () => {
    expect(extractResourceUid('[gd_scene format=3 uid="uid://scene"]')).toBe('uid://scene');
    expect(extractResourceUid('[gd_resource type="Resource" uid="uid://resource"]')).toBe('uid://resource');
    expect(extractResourceUid('[ext_resource uid="uid://dependency" path="res://dep.gd"]')).toBeNull();
  });

  it('extracts unique class_name declarations from structured GDScript statements', () => {
    expect(extractClassNames([
      'class_name Player',
      'class_name Player # duplicate',
      '# class_name Ignored',
      'var class_name AlsoIgnored',
    ].join('\n'))).toEqual(['Player']);
  });

  it('registers file metadata and returns changed targets by reanalysis scope', () => {
    const resolver = new GDScriptPathResolver('/workspace/game');
    registerGodotFileMetadata(resolver, 'scripts/player.gd', 'class_name Player');
    registerGodotFileMetadata(resolver, 'scenes/main.tscn', '[gd_scene uid="uid://main"]');

    expect(registerGodotFileMetadata(resolver, 'scripts/player.gd', 'class_name Hero')).toEqual({
      classNamesChanged: true,
      resourceUidChanged: false,
    });
    expect(registerGodotFileMetadata(resolver, 'scenes/main.tscn', '[gd_scene uid="uid://level"]')).toEqual({
      classNamesChanged: false,
      resourceUidChanged: true,
    });
    expect(readChangedAnalysisTargets(resolver, true, true)).toEqual([
      'scripts/player.gd',
      'scenes/main.tscn',
    ]);
  });
});
