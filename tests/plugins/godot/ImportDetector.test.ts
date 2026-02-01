import { describe, it, expect } from 'vitest';
import { GDScriptImportDetector } from '../../../src/plugins/godot/ImportDetector';

describe('GDScriptImportDetector', () => {
  const detector = new GDScriptImportDetector();

  describe('preload detection', () => {
    it('should detect preload with double quotes', () => {
      const content = 'const Player = preload("res://scenes/player.gd")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://scenes/player.gd');
      expect(refs[0].importType).toBe('static');
      expect(refs[0].line).toBe(1);
    });

    it('should detect preload with single quotes', () => {
      const content = "const Enemy = preload('res://scenes/enemy.gd')";
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://scenes/enemy.gd');
    });

    it('should detect multiple preloads on same line', () => {
      const content = 'var a = preload("res://a.gd"); var b = preload("res://b.gd")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(2);
      expect(refs[0].resPath).toBe('res://a.gd');
      expect(refs[1].resPath).toBe('res://b.gd');
    });

    it('should detect preload with .tscn files', () => {
      const content = 'const Scene = preload("res://scenes/level.tscn")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://scenes/level.tscn');
    });

    it('should handle whitespace in preload', () => {
      const content = 'const X = preload(  "res://test.gd"  )';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://test.gd');
    });
  });

  describe('load detection', () => {
    it('should detect load with double quotes', () => {
      const content = 'var scene = load("res://scenes/enemy.tscn")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://scenes/enemy.tscn');
      expect(refs[0].importType).toBe('dynamic');
    });

    it('should detect ResourceLoader.load', () => {
      const content = 'var res = ResourceLoader.load("res://data/config.tres")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://data/config.tres');
    });

    it('should detect load with user:// paths', () => {
      const content = 'var save = load("user://saves/game.tres")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('user://saves/game.tres');
    });
  });

  describe('extends detection', () => {
    it('should detect extends with file path', () => {
      const content = 'extends "res://scripts/base_character.gd"';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://scripts/base_character.gd');
      expect(refs[0].importType).toBe('static');
    });

    it('should ignore extends with built-in class', () => {
      const content = 'extends Node2D';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(0);
    });

    it('should ignore extends CharacterBody2D', () => {
      const content = 'extends CharacterBody2D';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(0);
    });

    it('should detect extends with single quotes', () => {
      const content = "extends 'res://base.gd'";
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://base.gd');
    });
  });

  describe('class_name detection', () => {
    it('should detect class_name declaration', () => {
      const content = 'class_name Player';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('Player');
      expect(refs[0].isDeclaration).toBe(true);
    });

    it('should detect class_name with extends', () => {
      const content = `class_name Player
extends CharacterBody2D`;
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('Player');
    });
  });

  describe('comments', () => {
    it('should ignore commented preload', () => {
      const content = '# const X = preload("res://test.gd")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(0);
    });

    it('should ignore inline comment after code', () => {
      const content = 'var x = preload("res://a.gd") # preload("res://b.gd")';
      const refs = detector.detect(content);

      expect(refs).toHaveLength(1);
      expect(refs[0].resPath).toBe('res://a.gd');
    });
  });

  describe('line numbers', () => {
    it('should report correct line numbers', () => {
      const content = `extends Node2D

const Player = preload("res://player.gd")

func _ready():
    var enemy = load("res://enemy.gd")`;
      const refs = detector.detect(content);

      expect(refs).toHaveLength(2);
      expect(refs[0].line).toBe(3); // preload
      expect(refs[1].line).toBe(6); // load
    });
  });

  describe('complex files', () => {
    it('should handle a realistic GDScript file', () => {
      const content = `class_name Player
extends "res://scripts/character_base.gd"

const Bullet = preload("res://weapons/bullet.tscn")
const HealthBar = preload("res://ui/health_bar.gd")

@onready var sprite = $Sprite2D

func _ready():
    var config = load("res://data/player_config.tres")
    
func shoot():
    var bullet = Bullet.instantiate()`;
      
      const refs = detector.detect(content);

      expect(refs).toHaveLength(5);
      
      // class_name
      expect(refs[0].resPath).toBe('Player');
      expect(refs[0].isDeclaration).toBe(true);
      
      // extends
      expect(refs[1].resPath).toBe('res://scripts/character_base.gd');
      
      // preloads
      expect(refs[2].resPath).toBe('res://weapons/bullet.tscn');
      expect(refs[3].resPath).toBe('res://ui/health_bar.gd');
      
      // load
      expect(refs[4].resPath).toBe('res://data/player_config.tres');
      expect(refs[4].importType).toBe('dynamic');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      const refs = detector.detect('');
      expect(refs).toHaveLength(0);
    });

    it('should handle file with only comments', () => {
      const content = `# This is a comment
# Another comment`;
      const refs = detector.detect(content);
      expect(refs).toHaveLength(0);
    });

    it('should not match non-res paths', () => {
      const content = 'var x = preload("file://local/path.gd")';
      const refs = detector.detect(content);
      expect(refs).toHaveLength(0);
    });
  });
});
