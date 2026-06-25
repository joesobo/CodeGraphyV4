---
"@codegraphy-dev/plugin-godot": patch
---

Godot class-name indexing no longer runs the full GDScript parser for metadata-only `class_name` discovery. On the CodeGraphy monorepo benchmark, the Godot metadata slice helped move cold indexing from 104.67s to 37.27s: 67.40s faster, a 64.39% reduction, and 2.81x faster. File analysis improved from 87,918ms to 23,352ms: 64,566ms faster, a 73.44% reduction, and 3.76x faster.
