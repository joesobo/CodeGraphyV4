Feature: Graph Scope Edge Types - TypeScript

Background:

Given I open the examples/example-typescript workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: TypeScript alias import edge type shows path alias imports

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Typescript Alias Import edge on
Then the top right of the graph says "1 connection"
And src/index.ts points to src/alias/themePack.ts

Scenario: TypeScript plugin exposes alias imports and semantic edges

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the TypeScript/JavaScript plugin on
When I open the Graph Scope
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, Contains, TypeScript Alias Import
And I close the Graph Scope

When I show only the TypeScript Alias Import edge type
Then I can see there are 18 nodes and 1 connection
And I see src/index.ts points to src/alias/themePack.ts
And src/alias/themePack.ts is no longer an orphan node

When I show only the Inherits edge type
Then I can see there are 18 nodes and 2 connections
And src/paletteRunner.ts points to src/baseGenerator.ts
And src/paletteRunner.ts points to src/paletteExporter.ts

When I show only the Calls edge type
Then I can see there are 18 nodes and 6 connections
And src/index.ts points to src/themeLabels.ts
And src/index.ts points to src/types.ts
And src/index.ts points to src/palette.ts
And src/palette.ts points to src/types.ts
And src/palette.ts points to src/harmony.ts
And src/harmony.ts points to src/swatches.ts
