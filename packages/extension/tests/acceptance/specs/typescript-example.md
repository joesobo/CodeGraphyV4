# Feature: TypeScript Example

## Scenario: TypeScript example renders expected file relationships and plugin edges

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 14 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-typescript workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 14 nodes and 6 connections
And src/index.ts points to src/types.ts
And src/index.ts points to src/utils.ts
And src/runner.ts points to src/baseRunner.ts
And src/utils.ts points to src/depth.ts
And src/depth.ts points to src/leaf.ts

And src/orphan.ts is an orphan node
And src/runnableThing.ts is an orphan node
And README.md is an orphan node
And package.json is an orphan node
And .gitignore is an orphan node
And tsconfig.json is an orphan node
And src/alias/greeting.ts is an orphan node

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the TypeScript/JavaScript plugin on
When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, TypeScript Alias Import
And I close the Graph Scope

And I toggle the Typescript Alias Import edge on
Then I can see there are 14 nodes and 7 connections
And I see src/index.ts points to src/alias/greeting.ts
And src/alias/greeting.ts is no longer an orphan node

Then I toggle the Imports and the Typescript Alias Import edge off
And I toggle the Inherits edge on
Then I can see there are 14 nodes and 2 connections
And src/runner.ts points to src/baseRunner.ts
And src/runner.ts points to src/runnableThing.ts
