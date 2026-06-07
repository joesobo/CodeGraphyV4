---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Make plugin toggles use Plugin IDs as the workspace activity identity.

The Plugins panel and Graph View settings now enable and disable plugins by the static Plugin ID, while package names stay as install metadata. Disabled plugins are written as explicit `enabled: false` workspace entries, enabled plugins are written as `enabled: true`, and default plugin options are looked up by Plugin ID with a package-name fallback for older installed-plugin records.
