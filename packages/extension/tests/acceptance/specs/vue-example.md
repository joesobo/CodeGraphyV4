# Feature: Vue Example

## Scenario: Vue example renders expected file nodes and import relationships

Given I open the examples/example-vue workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I see edges
And the graph nodes match the expected files in the examples/example-vue workspace

Then I can see there are 14 nodes and X connections

When I click the Graph Scope button
Then I see to buttons for switching views between node type and edge type toggles
And I select edge types

Then I see a list of edge types with toggles
And I toggle the Type imports edge on
And I close the Graph Scope

Then I can see there are 14 nodes and Y connections

And main.ts points to App.vue
And App.vue points to components/CounterPanel.vue
And App.vue points to components/UserCard.vue
And App.vue points to data/users.ts
And App.vue points to composables/userCounter.ts
And users.ts points to types.ts
And UserCard.vue points to types.ts
And CounterPanel.vue points to StatusBadge.vue
And CounterPanel.vue points to useCounter.ts
And CounterPanel.vue points to types.ts

And README.md is an orphan node
And .gitignore is an orphan node
And package.json is an orphan node
And tsconfig.json is an orphan node
And vite.config.ts is an orphan node
