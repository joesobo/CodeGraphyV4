# @codegraphy/pro

CodeGraphy Pro is the optional account and Access Provider plugin for paid CodeGraphy capabilities.

This package does not implement paid feature behavior directly. It registers the Pro account surface and provides configurable Access state for paid plugins that declare `requiresAccess`.

## Contributions

- Access Provider: `codegraphy.pro.access`
- Graph View toolbar slot: `graph.toolbar`
- Graph View panel slot: `graph.panelSlot`

Full account, billing, and subscription flows are handled by the CodeGraphy web app and follow-up Pro product work.
