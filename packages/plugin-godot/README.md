# GDScript (Godot) Plugin

Detects dependencies in GDScript files by parsing preload/load calls, extends statements, and class_name usage patterns.

## Supported Extensions

`.gd`

## Rules

| Rule | Description |
|------|-------------|
| Preload | `preload("res://...")` -- compile-time loading |
| Load | `load("res://...")`, `ResourceLoader.load()` -- runtime loading |
| Extends | `extends "res://..."` -- script inheritance by path |
| Class Name Usage | Type annotations, static calls, `is`/`as` checks using registered class names |

## Path Resolution

- `res://` paths map directly to workspace-relative paths
- Class names resolved via `class_name` declarations registered during `onPreAnalyze`
- PascalCase to snake_case fallback for scripts without explicit `class_name`
