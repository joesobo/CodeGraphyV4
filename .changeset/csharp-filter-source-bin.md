---
"@codegraphy-dev/plugin-csharp": patch
---

Keep C# default filters from hiding source folders named `bin` in mixed-language workspaces.

C# build output under `bin/Debug`, `bin/Release`, `obj/Debug`, and `obj/Release` is still filtered by default, but source folders such as Dart's `bin/` entrypoint folder remain discoverable.
