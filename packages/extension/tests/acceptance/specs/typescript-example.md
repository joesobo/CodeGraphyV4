# Feature: TypeScript Example

## Scenario: TypeScript example renders feature-flag rollout file relationships without the plugin

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
Then I see graph nodes
And I show no edge types
Then I can see there are 15 nodes and 0 connections
And the graph nodes match the expected files in the examples/example-typescript workspace

When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits
And I close the Graph Scope

When I toggle the Imports edge on
Then I can see there are 15 nodes and 15 connections
And src/index.ts points to src/format.ts
And src/index.ts points to src/rollout.ts
And src/rollout.ts points to src/audit.ts
And src/rollout.ts points to src/config.ts
And src/rollout.ts points to src/evaluator.ts
And src/config.ts points to src/types.ts
And src/evaluator.ts points to src/baseEvaluator.ts
And src/evaluator.ts points to src/contract.ts

And src/orphan.ts is an orphan node
And README.md is an orphan node
And package.json is an orphan node
And .gitignore is an orphan node
And tsconfig.json is an orphan node
And src/alias/clock.ts is an orphan node

## Scenario: TypeScript example exposes type-only imports separately

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File node type
And I show no edge types
When I toggle the Type imports edge on
Then I can see there are 15 nodes and 8 connections
And src/index.ts points to src/types.ts
And src/rollout.ts points to src/types.ts
And src/evaluator.ts points to src/types.ts
And src/evaluator.ts points to src/contract.ts
And src/format.ts points to src/types.ts
And src/audit.ts points to src/types.ts
And src/config.ts points to src/types.ts
And src/contract.ts points to src/types.ts

## Scenario: TypeScript plugin resolves tsconfig path aliases

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I click the plugins button
And I toggle the TypeScript/JavaScript plugin on
When I click the Graph Scope button
And I select edge types
Then the available edge types are Imports, References, Calls, Type imports, Inherits, TypeScript Alias Import
And I close the Graph Scope

And I show only the File node type
And I show no edge types
When I toggle the TypeScript Alias Import edge on
Then I can see there are 15 nodes and 1 connection
And src/index.ts points to src/alias/clock.ts
And src/alias/clock.ts is no longer an orphan node

## Scenario: TypeScript example exposes supported symbol and constant node types

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show no edge types
When I show only the File and Function node types
Then I can see there are 21 nodes and 0 connections
And src/rollout.ts#evaluateCheckout:function is an orphan node
And src/format.ts#formatDecision:function is an orphan node
When I show only the File and Class node types
Then I can see there are 17 nodes and 0 connections
And the visible graph includes the Class node BaseEvaluator from src/baseEvaluator.ts
And the visible graph includes the Class node PercentageEvaluator from src/evaluator.ts
When I show only the File and Interface node types
Then I can see there are 17 nodes and 0 connections
And src/contract.ts#FlagEvaluator:interface is an orphan node
And src/types.ts#FeatureFlag:interface is an orphan node
When I show only the File and Type node types
Then I can see there are 17 nodes and 0 connections
And src/types.ts#RolloutDecision:type is an orphan node
And src/types.ts#RolloutRequest:type is an orphan node
When I show only the File and Enum node types
Then I can see there are 16 nodes and 0 connections
And the visible graph includes the Enum node RolloutStage from src/types.ts
When I show only the File and Constant node types
Then I can see there are 23 nodes and 0 connections
And the visible graph includes the Constant node demoRequest from src/index.ts
And the visible graph includes the Constant node checkoutFlag from src/config.ts

## Scenario: TypeScript example connects symbol-level calls and inheritance

Given I open the examples/example-typescript workspace in VS Code
When I open the CodeGraphy extension graph view
And I have indexed the workspace
And I show only the File, Function, Class and Interface node types
And I show no edge types
When I toggle the Calls edge on
Then I can see there are 25 nodes and 3 connections
And the visible graph shows evaluateCheckout in src/rollout.ts calling writeAudit in src/audit.ts
And the visible graph shows index.ts in src/index.ts calling evaluateCheckout in src/rollout.ts
When I toggle the Calls edge off
And I toggle the Inherits edge on
Then I can see there are 25 nodes and 2 connections
And the visible graph shows PercentageEvaluator in src/evaluator.ts inheriting from BaseEvaluator in src/baseEvaluator.ts
And the visible graph shows PercentageEvaluator in src/evaluator.ts inheriting from FlagEvaluator in src/contract.ts
