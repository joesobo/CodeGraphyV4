# Feature: Vue Example

## Scenario: Vue example renders expected file nodes and import relationships

Given I open the examples/example-vue workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-vue workspace

Then I can see there are 15 nodes and 9 connections

When I click the Graph Scope button
Then I see to buttons for switching views between node type and edge type toggles
And I select edge types

Then the available edge types are Imports, References, Calls, Re-exports, Type imports
Then I see a list of edge types with toggles
And I toggle the Type imports edge on
And I close the Graph Scope

Then I can see there are 15 nodes and 12 connections

And src/main.ts points to src/App.vue
And src/App.vue points to src/components/CounterPanel.vue
And src/App.vue points to src/components/UserCard.vue
And src/App.vue points to src/components/LazyProfilePanel.vue
And src/App.vue points to src/data/users.ts
And src/App.vue points to src/composables/useCounter.ts
And src/data/users.ts points to src/types.ts
And src/components/LazyProfilePanel.vue points to src/data/users.ts
And src/components/UserCard.vue points to src/types.ts
And src/components/CounterPanel.vue points to src/components/StatusBadge.vue
And src/components/CounterPanel.vue points to src/composables/useCounter.ts
And src/components/CounterPanel.vue points to src/types.ts

And README.md is an orphan node
And .gitignore is an orphan node
And package.json is an orphan node
And tsconfig.json is an orphan node
And vite.config.ts is an orphan node
