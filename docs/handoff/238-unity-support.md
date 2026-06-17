# 238 Unity Support

Manual alignment notes for Trello card 238.

## Settled Boundaries

- Unity support should be a separate Unity Plugin layered over Core C# Tree-sitter Language Coverage, not an expansion of the metadata-only C# plugin.
- The Unity Plugin should perform Unity Project File Analysis without launching the Unity Editor or reading generated editor state.
- The Unity Parser Model should be CodeGraphy-owned TypeScript code inside the Unity Plugin, using Unity parser precedents as reference material rather than executing an external Python, C#, or Rust parser runtime.
- Low-level parsing may use general-purpose packages such as `yaml` for UnityYAML documents and `jsonc-parser` for tolerant JSON-like Unity configuration files.
- Unity-specific meaning belongs in Plugin Analysis. Core C# should continue to own syntax-backed C# facts such as classes, methods, fields, calls, type references, inheritance, and `using` relationships.
- The example should come first. `examples/example-unity` is the source-of-truth target for the full Unity support PR, and implementation should grow to satisfy that example.
- Human-owned acceptance spec Markdown remains untouched until the example and expected graph are reviewed and approved.

## Parser Direction

- Use the Python `unityparser` project as the closest parser precedent.
- Adapt its important read-side ideas:
  - UnityYAML files contain multiple documents.
  - Document headers carry Unity class IDs, local file IDs, and sometimes stripped flags.
  - Parsed entries should keep their Unity class name, class ID, file ID, and serialized properties.
  - `.meta` files provide GUIDs that serialized references use to resolve target assets.
- Do not copy its write/dump behavior for the first CodeGraphy implementation. CodeGraphy needs deterministic read/index behavior, not faithful UnityYAML round-tripping.
- Treat `unity-yaml-parser` on npm as spike material only; it is too thin to become the plugin foundation.

## Unity Graph Scope

- The Unity Plugin owns a Unity parent row in Graph Scope.
- The Unity parent row appears only when the Unity Plugin is enabled and applicable to the workspace.
- Planned child Node Type rows include:
  - `Scene`
  - `Prefab`
  - `GameObject`
  - `Component`
  - `ScriptableObject Asset`
- These are Unity Concept Nodes, not Core Symbol Nodes.

## Example Contract

The Unity example should look and feel like a small real Unity project. It should not be a parser sampler or a narrow v1 fixture.

Planned example surfaces:

- `ProjectSettings/ProjectSettings.asset`
- `Packages/manifest.json`
- `Assets/Scenes/MainScene.unity`
- `Assets/Prefabs/Player.prefab`
- `Assets/ScriptableObjects/PlayerStats.asset`
- `Assets/Scripts/PlayerController.cs`
- `Assets/Scripts/GameManager.cs`
- `Assets/Scripts/UI/StartButton.cs`
- `Assets/Scripts/Data/PlayerStats.cs`
- `Assets/Scripts/Runtime/Runtime.asmdef`
- Matching `.meta` files for GUID resolution

Planned graph concepts:

- A Scene node for `MainScene`.
- A Prefab node for `Player`.
- GameObject nodes for meaningful scene and prefab objects.
- Component nodes for MonoBehaviour attachments and important built-in components.
- A ScriptableObject Asset node for `PlayerStats`.
- File nodes for the serialized Unity files and C# scripts.
- Normal Core C# Symbol Nodes and relationships inside the scripts.

Planned relationships:

- Scene contains GameObjects.
- Prefab contains GameObjects.
- GameObjects contain Components.
- MonoBehaviour Components reference C# script files through `.meta` GUID resolution.
- Serialized fields reference assets such as `PlayerStats.asset`.
- UI event handler references connect serialized Unity events to C# methods where feasible.
- Assembly definition files define or reference script assembly boundaries where useful.
- Existing CodeGraphy Edge Types such as `contains`, `reference`, `load`, and `type` should be reused when their meanings honestly fit.
- Add Unity-owned Edge Types only when existing edge vocabulary would hide important Unity semantics.

## Open Questions

- Final node type IDs and labels for the Unity parent row and child concept rows.
- Whether `Scene` and `Prefab` should also stay visible as file-backed concept nodes when File nodes are disabled.
- Exact edge kinds for scene/prefab composition versus serialized asset references.
- Whether UI persistent-call parsing belongs in the first implementation pass or only in the full example expectation.
