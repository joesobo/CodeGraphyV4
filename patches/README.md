# Dependency Patches

## `tree-sitter@0.25.0`

CodeGraphy carries a temporary pnpm patch for `tree-sitter@0.25.0` so the
native Node binding builds with C++20 on Node 23 and newer.

Upstream has already merged the equivalent fix in
tree-sitter/node-tree-sitter#258, but the fixed npm release is not currently
published. The follow-up issue is:

https://github.com/tree-sitter/node-tree-sitter/issues/276

Remove this patch once `tree-sitter` publishes a release that includes the
Node 23+ C++20 build fix, then replace it with a normal dependency update.

This pnpm patch only applies inside this workspace; npm does not propagate a
package publisher's pnpm patches to consumers. Until the upstream release is
available, `@codegraphy-dev/core` therefore declares Node 20 through 22 as its
supported CLI range.
