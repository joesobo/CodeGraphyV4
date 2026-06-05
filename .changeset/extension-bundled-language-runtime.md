---
"@codegraphy-dev/extension": minor
---

Bundle the new Objective-C and Scala native Tree-sitter runtimes with the VS Code extension.

Users can open Objective-C, Scala, and Pascal workspaces in the extension and index them without installing separate language plugins. The extension package now vendors the Objective-C and Scala native grammar packages during build/VSIX packaging so language analysis works consistently across supported desktop platforms.
