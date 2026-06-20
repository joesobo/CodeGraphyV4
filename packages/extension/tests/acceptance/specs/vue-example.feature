Feature: Vue Example

Background:

Given I open the examples/example-vue workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Vue example renders file nodes and import relationships

Then I see graph nodes
And I show no edge types
And I can see there are 16 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-vue workspace

When I open the Graph Scope
Then I see two buttons for switching views between node type and edge type toggles
And I select edge types
And the available edge types are Imports, References, Calls, Type imports, Inherits, Contains
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 16 nodes and 9 connections

And src/main.ts points to src/App.vue
And src/App.vue points to src/components/CounterPanel.vue
And src/App.vue points to src/components/UserCard.vue
And src/App.vue points to src/components/LazyProfilePanel.vue
And src/App.vue points to src/data/users.ts
And src/App.vue points to src/composables/useCounter.ts
And src/components/LazyProfilePanel.vue points to src/data/users.ts
And src/components/CounterPanel.vue points to src/components/StatusBadge.vue
And src/components/CounterPanel.vue points to src/composables/useCounter.ts

And README.md is an orphan node
And .gitignore is an orphan node
And package.json is an orphan node
And tsconfig.json is an orphan node
And vite.config.ts is an orphan node

Scenario: Vue example exposes type, inheritance, and call relationships

When I toggle the Type Imports edge on
Then I can see there are 16 nodes and 4 connections

When I toggle the Type Imports edge off
And I toggle the Inherits edge on
Then I can see there are 16 nodes and 1 connection
And src/types.ts points to src/inheritance.ts

When I toggle the Inherits edge off
And I toggle the Calls edge on
Then I can see there are 16 nodes and 2 connections
And src/App.vue points to src/composables/useCounter.ts
And src/components/CounterPanel.vue points to src/composables/useCounter.ts
