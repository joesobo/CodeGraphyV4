Feature: Graph Scope Edge Types - Vue

Background:

Given I open the examples/example-vue workspace in VS Code
And I open the CodeGraphy extension graph view
And I have indexed the workspace

Scenario: Imports edge type shows Vue import relationships

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Imports edge on
Then the top right of the graph says "9 connections"
And src/main.ts points to src/App.vue
And src/App.vue points to src/components/CounterPanel.vue
And src/App.vue points to src/components/UserCard.vue
And src/App.vue points to src/components/LazyProfilePanel.vue
And src/App.vue points to src/data/users.ts
And src/App.vue points to src/composables/useCounter.ts
And src/components/LazyProfilePanel.vue points to src/data/users.ts
And src/components/CounterPanel.vue points to src/components/StatusBadge.vue
And src/components/CounterPanel.vue points to src/composables/useCounter.ts

Scenario: Type imports edge type shows Vue type-only dependencies

When I show only the File node type
And I show no edge types
Then the top right of the graph says "0 connections"
When I toggle the Type imports edge on
Then the top right of the graph says "4 connections"
And src/data/users.ts points to src/types.ts
And src/components/UserCard.vue points to src/types.ts
And src/components/CounterPanel.vue points to src/types.ts
And src/types.ts points to src/inheritance.ts
