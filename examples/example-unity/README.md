# Unity Example

This example workspace is the source-of-truth contract for CodeGraphy's Unity
plugin support. It is intentionally a small but believable Unity project:
source-controlled text assets, `.meta` GUIDs, C# scripts, an assembly
definition, a scene, a prefab, a ScriptableObject asset, and a serialized UI
event.

The project does not require the Unity Editor to run for CodeGraphy analysis.
It models the Unity Project File Analysis contract from `CONTEXT.md`.

## Project Shape

- `ProjectSettings/ProjectSettings.asset` enables force-text serialization.
- `Packages/manifest.json` declares a small set of Unity packages.
- `Assets/Scripts/Runtime/CodeGraphyUnityRuntime.asmdef` groups the runtime scripts.
- `Assets/Scenes/MainScene.unity` contains the `GameManager`, a player prefab instance, and a start button UI.
- `Assets/Prefabs/Player.prefab` contains the `Player` GameObject and a `PlayerController` MonoBehaviour.
- `Assets/ScriptableObjects/PlayerStats.asset` is a ScriptableObject asset referenced by the scene and prefab.
- Matching `.meta` files provide GUIDs for script, prefab, scene, assembly, and asset resolution.

## Expected Unity Nodes

When the Unity plugin is enabled, Graph Scope should show a Unity parent row
with Unity concept rows under it:

- `Scene`
- `Prefab`
- `GameObject`
- `Component`
- `ScriptableObject Asset`

Expected concept nodes include:

- Scene: `MainScene`
- Prefab: `Player`
- GameObjects: `GameManager`, `Player`, `Canvas`, `StartButton`
- Components: `GameManager`, `PlayerController`, `StartButton`
- ScriptableObject Asset: `PlayerStats`

## Expected Relationships

The example is designed to prove Unity graph value that Core C# cannot infer by
itself:

- `MainScene` contains scene GameObjects such as `GameManager`, `Canvas`, and `StartButton`.
- `MainScene` loads or references the `Player` prefab through a serialized prefab reference.
- `Player` prefab contains the `Player` GameObject.
- GameObjects contain their attached Components.
- MonoBehaviour Components reference C# script files through `m_Script` GUIDs.
- `GameManager` and `PlayerController` serialized fields reference `PlayerStats.asset`.
- The start button serialized UnityEvent references `GameManager.StartGame`.
- Core C# analysis still owns normal C# symbols and relationships inside the scripts.

## Suggested Manual Check

1. Open this folder in VS Code.
2. Run `CodeGraphy: Open`.
3. Enable the Unity plugin once it exists.
4. Open Graph Scope and enable the Unity parent row plus all Unity child rows.

Expected behavior:

- File nodes show the serialized Unity files and C# scripts.
- Unity concept nodes explain how the game scene is assembled.
- Toggling the Unity plugin off removes Unity concept rows and plugin-owned relationships.
- C# symbols remain governed by Core C# Tree-sitter Language Coverage.
