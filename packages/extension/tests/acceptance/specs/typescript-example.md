# Feature: TypeScript Example

## Scenario: TypeScript example renders expected file relationships and plugin edges

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-typescript workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Re-exports, Type imports
And I close the Graph Scope

Then I can see there are 11 nodes and 5 connections
And src/index.ts points to src/types.ts
And src/index.ts points to src/utils.ts
And src/utils.ts points to src/depth.ts
And src/depth.ts points to src/leaf.ts

And src/orphan.ts is an orphan node
And README.md is an orphan node
And package.json is an orphan node
And .gitignore is an orphan node
And tsconfig.json is an orphan node
And src/alias/greeting.ts is an orphan node

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the TypeScript/JavaScript plugin on
Then I can see there are 11 nodes and 6 connections

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Re-exports, Type imports, TypeScript Alias Import
And I close the Graph Scope

And I see src/index.ts points to src/alias/greeting.ts
And src/alias/greeting.ts is no longer an orphan node
