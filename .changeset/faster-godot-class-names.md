---
"@codegraphy-dev/plugin-godot": patch
---

Godot class-name indexing no longer runs the full GDScript parser for metadata-only `class_name` discovery. On the CodeGraphy monorepo benchmark, the Godot metadata slice helped move cold indexing from 104.67s to 37.27s and file analysis from 87,918ms to 23,352ms.
