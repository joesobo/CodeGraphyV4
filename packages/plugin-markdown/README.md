# `@codegraphy-dev/plugin-markdown`

Headless CodeGraphy plugin for Markdown and Obsidian-style wikilinks.

This package exposes the Markdown plugin runtime used by `@codegraphy-dev/core`. It detects wikilinks such as `[[Note]]`, `[[folder/Note|Alias]]`, and `![[Embed]]`, then emits Relationship Graph references between workspace files.

Installing this package separately requires Node.js `^22.14.0 || >=23.6.0`. Node.js
20 is not supported. The VS Code extension already includes and manages this
plugin, so extension users do not install it separately.

## CodeGraphy Metadata

The package declares `package.json#codegraphy` metadata so CodeGraphy can register and validate the plugin without importing runtime code. Runtime loading happens during explicit Indexing.
