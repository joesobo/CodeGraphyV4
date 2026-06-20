# Feature: Svelte Example

## Scenario: Svelte example renders expected file nodes and plugin import relationships

Given I open the examples/example-svelte workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 13 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-svelte workspace

When I toggle the Imports edge on
Then I can see there are 13 nodes and 1 connection

When I click the plugins button
Then I see a list of plugins with toggles
And I toggle the Svelte plugin on
Then I see edges
And I can see there are 13 nodes and 4 connections

And src/main.ts points to src/App.svelte
And src/App.svelte points to src/loadFeature.ts
And src/App.svelte points to src/components/UserCard.svelte
And src/App.svelte points to src/components/LazyPanel.svelte

When I click the Graph Scope button
Then I see to buttons for switching views between node type and edge type toggles
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, Contains
And I close the Graph Scope

Then I toggle the Imports edge off
And I toggle the Type Imports edge on
Then I can see there are 13 nodes and 3 connections
And src/App.svelte points to src/types.ts
And src/components/UserCard.svelte points to src/types.ts
And src/types.ts points to src/inheritance.ts

And README.md is an orphan node
And index.html is an orphan node
And package.json is an orphan node
And tsconfig.json is an orphan node

Then I toggle the Type Imports edge off
And I toggle the Inherits edge on
Then I can see there are 13 nodes and 1 connections
And src/types.ts points to src/inheritance.ts

Then I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 13 nodes and 1 connection
And src/App.svelte points to src/loadFeature.ts
