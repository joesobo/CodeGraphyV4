# CodeGraphy Unity

Adds Unity project structure analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-unity`](https://www.npmjs.com/package/@codegraphy-dev/plugin-unity)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/core` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-unity
codegraphy plugins register @codegraphy-dev/plugin-unity
codegraphy plugins enable @codegraphy-dev/plugin-unity
codegraphy index
```

## Detection coverage

- `.unity` scene files stay visible as file nodes and emit GameObject and Component Symbol Nodes.
- `.prefab` files stay visible as file nodes and emit GameObject and Component Symbol Nodes.
- MonoBehaviour components resolve their C# script names through Unity `.meta` GUID files when those files are present in the workspace.
- Unity containment emits `contains` edges from the scene or prefab file node to GameObject, and from GameObject to Component.
- MonoBehaviour script references emit `reference` edges to the resolved C# script file.
- Unity asset references use the standard `reference` edge row for resolved scripts, prefab instances, and serialized asset fields.
- Unity file groups ship icon-backed defaults for scenes, prefabs, serialized assets, materials, assembly definitions, and input actions.
- Unity generated folders and IDE/build artifacts are filtered by default, including `Library`, `Temp`, `Logs`, `ProjectSettings`, `UserSettings`, `.meta`, generated project files, and common build outputs.

The plugin does not depend on the Unity Editor. It reads Unity's text-serialized YAML and `.meta` files directly.

## Graph Scope

The Unity plugin contributes a `Unity` Graph Scope group with these rows:

- GameObject
- Component

These rows are disabled by default and appear when the Unity plugin is applicable to the indexed workspace. Scenes and prefabs use their normal file nodes rather than duplicate Unity-specific symbol rows.

Turning the Unity plugin off removes these Unity-specific rows and filters the plugin's nodes and Unity-sourced edges from the graph.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-unity)
