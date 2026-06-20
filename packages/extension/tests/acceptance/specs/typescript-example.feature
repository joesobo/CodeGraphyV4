Feature: TypeScript Example

Scenario: TypeScript example renders file and type-import relationships

Given I open the examples/example-typescript workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
And I can see there are 18 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-typescript workspace

When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, Contains
And I close the Graph Scope

When I show only the Imports edge type
Then I can see there are 18 nodes and 11 connections
And src/index.ts points to src/lazyPreview.ts
And src/index.ts points to src/seedSettings.ts
And src/index.ts points to src/registry.ts
And src/index.ts points to src/themeLabels.ts
And src/index.ts points to src/types.ts
And src/index.ts points to src/palette.ts
And src/seedSettings.ts points to src/types.ts
And src/paletteRunner.ts points to src/baseGenerator.ts
And src/harmony.ts points to src/swatches.ts
And src/palette.ts points to src/harmony.ts
And src/palette.ts points to src/types.ts

And src/scratchpad.ts is an orphan node
And src/paletteExporter.ts is an orphan node
And README.md is an orphan node
And package.json is an orphan node
And .gitignore is an orphan node
And tsconfig.json is an orphan node
And src/alias/themePack.ts is an orphan node

When I show only the Type imports edge type
Then I can see there are 18 nodes and 6 connections
And src/alias/themePack.ts points to src/types.ts
And src/index.ts points to src/types.ts
And src/lazyPreview.ts points to src/types.ts
And src/registry.ts points to src/types.ts
And src/paletteRunner.ts points to src/paletteExporter.ts
And src/themeLabels.ts points to src/types.ts
